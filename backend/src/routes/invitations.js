const express = require('express');
const { body, validationResult } = require('express-validator');
const ProjectInvitation = require('../models/ProjectInvitation');
const ProjectMember = require('../models/ProjectMember');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/invitations
// @desc    Get user's pending invitations
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const invitations = await ProjectInvitation.getPendingInvitations(req.user._id);
    res.json({ invitations });
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/invitations/:id/accept
// @desc    Accept project invitation
// @access  Private
router.post('/:id/accept', auth, async (req, res) => {
  try {
    const invitationId = req.params.id;
    
    const invitation = await ProjectInvitation.findById(invitationId)
      .populate('project', 'name')
      .populate('invitedBy', 'name');

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    if (invitation.invitedUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this invitation' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: 'Invitation has already been responded to' });
    }

    if (invitation.isExpired()) {
      return res.status(400).json({ message: 'Invitation has expired' });
    }

    // Check if user is already an active member
    const existingMember = await ProjectMember.findOne({
      project: invitation.project._id,
      user: req.user._id,
      status: 'active'
    });

    if (existingMember) {
      return res.status(400).json({ message: 'You are already a member of this project' });
    }

    // Accept the invitation
    await invitation.accept();

    // Use findOneAndUpdate with upsert to handle both update and create atomically
    const member = await ProjectMember.findOneAndUpdate(
      {
        project: invitation.project._id,
        user: req.user._id
      },
      {
        $set: {
          status: 'active',
          role: invitation.role,
          invitedBy: invitation.invitedBy._id,
          joinedAt: new Date()
        },
        $setOnInsert: {
          project: invitation.project._id,
          user: req.user._id
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    ).populate('user', 'name email avatar');

    // Mark related notification as read and update status
    console.log('Updating notification for invitation:', invitationId, 'user:', req.user._id);
    
    // First, let's see what notifications exist for this user
    const existingNotifications = await Notification.find({
      recipient: req.user._id,
      type: 'project_invitation'
    });
    console.log('Existing notifications for user:', existingNotifications.map(n => ({ 
      id: n._id, 
      data: n.data,
      projectId: invitation.project._id 
    })));
    
    // Try updating by projectId instead of invitationId
    const notificationUpdateResult = await Notification.updateMany(
      {
        recipient: req.user._id,
        type: 'project_invitation',
        'data.projectId': invitation.project._id.toString(),
        'data.status': 'pending'
      },
      { 
        isRead: true, 
        readAt: new Date(),
        'data.status': 'accepted'
      }
    );
    
    console.log('Notification update result:', notificationUpdateResult);

    res.json({
      message: 'Invitation accepted successfully',
      member: member,
      project: invitation.project
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/invitations/:id/decline
// @desc    Decline project invitation
// @access  Private
router.post('/:id/decline', auth, async (req, res) => {
  try {
    const invitationId = req.params.id;
    
    const invitation = await ProjectInvitation.findById(invitationId)
      .populate('project', 'name');

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    if (invitation.invitedUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to decline this invitation' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: 'Invitation has already been responded to' });
    }

    // Decline the invitation
    await invitation.decline();

    // Mark related notification as read and update status
    console.log('Updating notification for declined invitation:', invitationId, 'user:', req.user._id);
    
    const notificationUpdateResult = await Notification.updateMany(
      {
        recipient: req.user._id,
        type: 'project_invitation',
        'data.projectId': invitation.project._id.toString(),
        'data.status': 'pending'
      },
      { 
        isRead: true, 
        readAt: new Date(),
        'data.status': 'declined'
      }
    );
    
    console.log('Decline notification update result:', notificationUpdateResult);

    res.json({
      message: 'Invitation declined successfully',
      project: invitation.project
    });
  } catch (error) {
    console.error('Decline invitation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
