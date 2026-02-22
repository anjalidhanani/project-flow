const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const ProjectMember = require('../models/ProjectMember');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/search
// @desc    Search users by email or name
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const searchRegex = new RegExp(q.trim(), 'i');
    
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // Exclude current user
        { isActive: true },
        {
          $or: [
            { name: searchRegex },
            { email: searchRegex }
          ]
        }
      ]
    })
      .select('name email avatar role')
      .limit(parseInt(limit));

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/profile/:id
// @desc    Get user profile
// @access  Private
router.get('/profile/:id', auth, async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId)
      .select('name email avatar role createdAt lastLogin');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's project count and recent activity
    const projectCount = await ProjectMember.countDocuments({
      user: userId,
      status: 'active'
    });

    res.json({
      user: {
        ...user.toObject(),
        projectCount
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/stats
// @desc    Get current user statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's projects
    const userProjects = await ProjectMember.find({
      user: userId,
      status: 'active'
    }).populate('project');

    const projects = userProjects.map(mp => mp.project);

    // Get tasks assigned to user
    const Task = require('../models/Task');
    const assignedTasks = await Task.find({
      assignedTo: userId,
      project: { $in: projects.map(p => p._id) }
    });

    // Get tasks created by user
    const createdTasks = await Task.find({
      createdBy: userId,
      project: { $in: projects.map(p => p._id) }
    });

    // Calculate statistics
    const stats = {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'active').length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      
      totalAssignedTasks: assignedTasks.length,
      completedTasks: assignedTasks.filter(t => t.status === 'completed').length,
      pendingTasks: assignedTasks.filter(t => t.status !== 'completed').length,
      overdueTasks: assignedTasks.filter(t => t.isOverdue).length,
      
      totalCreatedTasks: createdTasks.length,
      
      projectsByRole: {
        owner: userProjects.filter(mp => mp.role === 'owner').length,
        admin: userProjects.filter(mp => mp.role === 'admin').length,
        manager: userProjects.filter(mp => mp.role === 'manager').length,
        developer: userProjects.filter(mp => mp.role === 'developer').length,
        viewer: userProjects.filter(mp => mp.role === 'viewer').length
      }
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/team
// @desc    Get team members across all user's projects
// @access  Private
router.get('/team', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all projects where user is a member
    const userProjects = await ProjectMember.find({
      user: userId,
      status: 'active'
    }).populate('project', 'name');

    const projectIds = userProjects.map(mp => mp.project._id);

    // Get all team members from these projects
    const teamMembers = await ProjectMember.find({
      project: { $in: projectIds },
      status: 'active',
      user: { $ne: userId } // Exclude current user
    })
      .populate('user', 'name email avatar role')
      .populate('project', 'name')
      .sort({ 'user.name': 1 });

    // Group by user to avoid duplicates and show their projects
    const teamMap = new Map();
    
    teamMembers.forEach(member => {
      const userId = member.user._id.toString();
      if (!teamMap.has(userId)) {
        teamMap.set(userId, {
          user: member.user,
          projects: [],
          roles: new Set()
        });
      }
      
      const teamMember = teamMap.get(userId);
      teamMember.projects.push({
        name: member.project.name,
        role: member.role
      });
      teamMember.roles.add(member.role);
    });

    // Convert to array and format
    const team = Array.from(teamMap.values()).map(member => ({
      ...member.user.toObject(),
      projects: member.projects,
      primaryRole: Array.from(member.roles)[0], // Use first role as primary
      projectCount: member.projects.length
    }));

    res.json({ team, total: team.length });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user statistics
    const projectCount = await ProjectMember.countDocuments({
      user: req.user._id,
      status: 'active'
    });

    res.json({
      user: {
        ...user.toObject(),
        projectCount
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  auth,
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters'),
  body('location').optional().isLength({ max: 100 }).withMessage('Location must be less than 100 characters'),
  body('website').optional().custom((value) => {
    if (!value || value.trim() === '') return true;
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(value)) {
      throw new Error('Please provide a valid website URL');
    }
    return true;
  }),
  body('timezone').optional().isString().withMessage('Timezone must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, email, bio, location, website, timezone } = req.body;
    const userId = req.user._id;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(), 
        _id: { $ne: userId } 
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already in use' });
      }
    }

    // Update user profile
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website;
    if (timezone) updateData.timezone = timezone;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', [
  auth,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Get user with password (explicitly select password field)
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
