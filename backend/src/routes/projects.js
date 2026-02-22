const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const Task = require('../models/Task');
const { auth } = require('../middleware/auth');
const { 
  canDeleteProject, 
  canManageMembers, 
  canEditProject 
} = require('../middleware/projectAuth');

const router = express.Router();

// @route   GET /api/projects
// @desc    Get user's projects
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    // Get projects where user is a member
    const memberProjects = await ProjectMember.find({ 
      user: req.user._id, 
      status: 'active' 
    }).populate({
      path: 'project',
      match: status ? { status } : {},
      populate: {
        path: 'owner',
        select: 'name email avatar'
      }
    });

    const projects = memberProjects
      .filter(mp => mp.project)
      .map(mp => ({
        ...mp.project.toObject(),
        memberRole: mp.role,
        permissions: mp.permissions
      }));

    // Calculate task statistics and member information for each project
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const [tasks, members] = await Promise.all([
          Task.find({ project: project._id }),
          ProjectMember.find({ project: project._id, status: 'active' })
            .populate('user', 'name email avatar')
        ]);
        
        const completedTasks = tasks.filter(task => task.status === 'completed');
        
        return {
          ...project,
          taskCount: tasks.length,
          completedTaskCount: completedTasks.length,
          progress: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
          memberCount: members.length,
          members: members.map(member => ({
            _id: member.user._id,
            name: member.user.name,
            email: member.user.email,
            avatar: member.user.avatar,
            role: member.role
          }))
        };
      })
    );

    res.json({
      projects: projectsWithStats,
      total: projectsWithStats.length
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private
router.post('/', [
  auth,
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be between 1 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  body('startDate')
    .isISO8601()
    .withMessage('Please provide a valid start date'),
  body('endDate')
    .isISO8601()
    .withMessage('Please provide a valid end date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, description, startDate, endDate, priority, budget, color, tags } = req.body;

    // Validate dates
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Create project
    const project = new Project({
      name,
      description,
      owner: req.user._id,
      startDate,
      endDate,
      priority: priority || 'medium',
      budget: budget || 0,
      color: color || '#1976d2',
      tags: tags || []
    });

    await project.save();

    // Add creator as project owner
    const projectMember = new ProjectMember({
      project: project._id,
      user: req.user._id,
      role: 'owner'
    });

    await projectMember.save();

    // Populate owner details
    await project.populate('owner', 'name email avatar');

    res.status(201).json({
      message: 'Project created successfully',
      project: {
        ...project.toObject(),
        memberRole: 'owner',
        permissions: projectMember.permissions
      }
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error during project creation' });
  }
});

// @route   GET /api/projects/:id
// @desc    Get project details
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const projectId = req.params.id;

    // Check if user is a member of the project
    const membership = await ProjectMember.findOne({
      project: projectId,
      user: req.user._id,
      status: 'active'
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    // Get project details
    const project = await Project.findById(projectId)
      .populate('owner', 'name email avatar');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get project members
    const members = await ProjectMember.getProjectMembers(projectId);

    // Get project tasks
    const tasks = await Task.find({ project: projectId })
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort({ createdAt: -1 });

    // Calculate project statistics
    const completedTasks = tasks.filter(task => task.status === 'completed');
    const overdueTasks = tasks.filter(task => task.isOverdue);

    res.json({
      project: {
        ...project.toObject(),
        memberRole: membership.role,
        permissions: membership.permissions
      },
      members,
      tasks,
      stats: {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        progress: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update project (Owner, Admin, or Manager only)
// @access  Private
router.put('/:id', [
  auth,
  canEditProject,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const projectId = req.params.id;
    const { name, description, status, priority, endDate, budget, color, tags } = req.body;

    // Validate end date if provided
    const project = await Project.findById(projectId);
    if (endDate && new Date(endDate) <= project.startDate) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Update project
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      {
        ...(name && { name }),
        ...(description && { description }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(endDate && { endDate }),
        ...(budget !== undefined && { budget }),
        ...(color && { color }),
        ...(tags && { tags })
      },
      { new: true, runValidators: true }
    ).populate('owner', 'name email avatar');

    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error during project update' });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete project (Owner and Admin only)
// @access  Private
router.delete('/:id', auth, canDeleteProject, async (req, res) => {
  try {
    const projectId = req.params.id;

    // Delete project and related data
    await Promise.all([
      Project.findByIdAndDelete(projectId),
      ProjectMember.deleteMany({ project: projectId }),
      Task.deleteMany({ project: projectId })
    ]);

    res.json({ 
      message: 'Project deleted successfully',
      deletedBy: {
        userId: req.user._id,
        role: req.projectMembership.role
      }
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error during project deletion' });
  }
});

// @route   POST /api/projects/:id/invite
// @desc    Invite user to project (Owner and Admin only)
// @access  Private
router.post('/:id/invite', [
  auth,
  canManageMembers,
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('role')
    .isIn(['admin', 'manager', 'developer', 'viewer'])
    .withMessage('Invalid role'),
  body('message')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Message cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const projectId = req.params.id;
    const { email, role = 'developer', message } = req.body;

    // Get project details
    const Project = require('../models/Project');
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Find user by email (they may or may not be registered)
    const User = require('../models/User');
    const userToInvite = await User.findOne({ email });
    
    // If user exists, check if they're already an active member
    if (userToInvite) {
      const existingMember = await ProjectMember.findOne({
        project: projectId,
        user: userToInvite._id,
        status: 'active'
      });

      if (existingMember) {
        return res.status(400).json({ message: 'User is already a member of this project' });
      }

      // Check if there's already a pending invitation for registered user
      const ProjectInvitation = require('../models/ProjectInvitation');
      const existingInvitation = await ProjectInvitation.hasPendingInvitation(projectId, userToInvite._id);
      
      if (existingInvitation) {
        return res.status(400).json({ message: 'User already has a pending invitation for this project' });
      }
    } else {
      // For unregistered users, check if there's already an email-based invitation
      const ProjectInvitation = require('../models/ProjectInvitation');
      const existingEmailInvitation = await ProjectInvitation.findOne({
        project: projectId,
        invitedEmail: email,
        status: 'pending'
      });
      
      if (existingEmailInvitation) {
        return res.status(400).json({ message: 'An invitation has already been sent to this email address' });
      }
    }

    // Create invitation (for both registered and unregistered users)
    const ProjectInvitation = require('../models/ProjectInvitation');
    const invitation = new ProjectInvitation({
      project: projectId,
      invitedUser: userToInvite ? userToInvite._id : null,
      invitedEmail: email,
      invitedBy: req.user._id,
      role,
      message
    });

    await invitation.save();

    // Cancel any existing invitation notifications for this user and project
    const Notification = require('../models/Notification');
    if (userToInvite) {
      console.log('Cancelling existing notifications for user:', userToInvite._id, 'project:', projectId);
      
      // First, update notifications without status to have pending status
      await Notification.updateMany(
        {
          recipient: userToInvite._id,
          type: 'project_invitation',
          'data.projectId': projectId,
          'data.status': { $exists: false }
        },
        { 
          'data.status': 'pending'
        }
      );
      
      // Then cancel all existing notifications for this project
      const updateResult = await Notification.updateMany(
        {
          recipient: userToInvite._id,
          type: 'project_invitation',
          'data.projectId': projectId,
          'data.status': { $in: ['pending', 'accepted', 'declined'] }
        },
        { 
          'data.status': 'cancelled',
          isRead: true,
          readAt: new Date()
        }
      );
      
      console.log('Cancelled notifications result:', updateResult);
    }

    // Double-check: Remove any remaining active notifications for this project
    if (userToInvite) {
      await Notification.deleteMany({
        recipient: userToInvite._id,
        type: 'project_invitation',
        'data.projectId': projectId,
        'data.status': { $ne: 'cancelled' }
      });
    }

    // Create new notification
    await Notification.createProjectInvitation({
      invitedUser: userToInvite._id,
      invitedBy: req.user._id,
      projectId: projectId,
      projectName: project.name,
      inviterName: req.user.name,
      role,
      invitationId: invitation._id,
      expiresAt: invitation.expiresAt
    });

    res.status(201).json({
      message: 'Invitation sent successfully',
      invitation: {
        _id: invitation._id,
        project: project.name,
        invitedUser: {
          name: userToInvite.name,
          email: userToInvite.email
        },
        role,
        status: invitation.status,
        createdAt: invitation.createdAt
      }
    });
  } catch (error) {
    console.error('Send invitation error:', error);
    res.status(500).json({ message: 'Server error during invitation' });
  }
});

// @route   PUT /api/projects/:id/members/:memberId
// @desc    Update member role
// @access  Private
router.put('/:id/members/:memberId', [
  auth,
  body('role')
    .isIn(['admin', 'manager', 'developer', 'viewer'])
    .withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { id: projectId, memberId } = req.params;
    const { role } = req.body;

    // Check if user has permission to manage members
    const membership = await ProjectMember.findOne({
      project: projectId,
      user: req.user._id,
      status: 'active'
    });

    if (!membership || !membership.permissions.canManageMembers) {
      return res.status(403).json({ message: 'Permission denied to manage project members' });
    }

    // Find the member to update
    const memberToUpdate = await ProjectMember.findById(memberId);
    if (!memberToUpdate) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Prevent non-owners from modifying owner's role
    if (memberToUpdate.role === 'owner' && membership.role !== 'owner') {
      return res.status(403).json({ message: 'Only project owner can modify owner permissions' });
    }

    // Prevent promoting someone to owner (only one owner allowed)
    if (role === 'owner' && membership.role !== 'owner') {
      return res.status(403).json({ message: 'Only project owner can assign owner role' });
    }

    // Prevent users from updating their own roles
    if (memberToUpdate.user.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: 'You cannot modify your own role' });
    }

    // Update member role
    const updatedMember = await ProjectMember.findByIdAndUpdate(
      memberId,
      { role },
      { new: true, runValidators: true }
    ).populate('user', 'name email avatar');

    if (!updatedMember) {
      return res.status(404).json({ message: 'Member not found' });
    }

    res.json({
      message: 'Member role updated successfully',
      member: updatedMember
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ message: 'Server error during member role update' });
  }
});

// @route   DELETE /api/projects/:id/members/:memberId
// @desc    Remove member from project
// @access  Private
router.delete('/:id/members/:memberId', auth, async (req, res) => {
  try {
    const { id: projectId, memberId } = req.params;

    // Check if user has permission to manage members
    const membership = await ProjectMember.findOne({
      project: projectId,
      user: req.user._id,
      status: 'active'
    });

    if (!membership || !membership.permissions.canManageMembers) {
      return res.status(403).json({ message: 'Permission denied to manage project members' });
    }

    // Find the member to remove
    const memberToRemove = await ProjectMember.findById(memberId);
    if (!memberToRemove) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Prevent removing project owner
    if (memberToRemove.role === 'owner') {
      return res.status(400).json({ message: 'Cannot remove project owner' });
    }

    // Remove member
    await ProjectMember.findByIdAndUpdate(memberId, { status: 'removed' });

    // Clean up any pending invitations for this user
    const ProjectInvitation = require('../models/ProjectInvitation');
    await ProjectInvitation.updateMany(
      {
        project: projectId,
        $or: [
          { invitedUser: memberToRemove.user },
          { invitedEmail: memberToRemove.user.email }
        ],
        status: 'pending'
      },
      { status: 'cancelled' }
    );

    // Update related notifications to cancelled status
    const Notification = require('../models/Notification');
    await Notification.updateMany(
      {
        recipient: memberToRemove.user,
        type: 'project_invitation',
        'data.projectId': projectId,
        'data.status': { $in: ['pending', 'accepted'] }
      },
      { 
        'data.status': 'cancelled',
        isRead: true,
        readAt: new Date()
      }
    );

    // Find the project owner
    const projectOwner = await ProjectMember.findOne({
      project: projectId,
      role: 'owner',
      status: 'active'
    });

    if (!projectOwner) {
      return res.status(500).json({ message: 'Project owner not found' });
    }

    const Task = require('../models/Task');

    // Unassign all tasks assigned to this member in this project
    await Task.updateMany(
      { 
        project: projectId,
        assignedTo: memberToRemove.user
      },
      { 
        $unset: { assignedTo: 1 }
      }
    );

    // Reassign all tasks created by this member to the project owner
    await Task.updateMany(
      {
        project: projectId,
        createdBy: memberToRemove.user
      },
      {
        createdBy: projectOwner.user
      }
    );

    res.json({ 
      message: 'Member removed successfully. All assigned tasks have been unassigned and tasks created by them have been transferred to the project owner.' 
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error during member removal' });
  }
});

// @route   GET /api/projects/:id/members
// @desc    Get project members
// @access  Private
router.get('/:id/members', auth, async (req, res) => {
  try {
    const projectId = req.params.id;

    // Check if user has access to this project
    const membership = await ProjectMember.findOne({
      project: projectId,
      user: req.user._id,
      status: 'active'
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    // Get project members
    const members = await ProjectMember.getProjectMembers(projectId);

    res.json({ members });
  } catch (error) {
    console.error('Get project members error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// One-time migration to fix existing notifications without status
router.post('/migrate-notifications', auth, async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    
    // Update all project invitation notifications without status to have pending status
    const result = await Notification.updateMany(
      {
        type: 'project_invitation',
        'data.status': { $exists: false }
      },
      { 
        'data.status': 'pending'
      }
    );
    
    console.log('Migration result:', result);
    res.json({ message: 'Migration completed', updated: result.modifiedCount });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ message: 'Migration failed' });
  }
});


module.exports = router;
