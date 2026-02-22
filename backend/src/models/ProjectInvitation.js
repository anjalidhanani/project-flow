const mongoose = require('mongoose');

const projectInvitationSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required']
  },
  invitedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  invitedEmail: {
    type: String,
    required: [true, 'Invited email is required'],
    lowercase: true,
    trim: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Inviter is required']
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'developer', 'viewer'],
    default: 'developer'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired', 'cancelled'],
    default: 'pending'
  },
  message: {
    type: String,
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  },
  respondedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to prevent duplicate invitations
projectInvitationSchema.index({ project: 1, invitedUser: 1, status: 1 });
projectInvitationSchema.index({ project: 1, invitedEmail: 1, status: 1 });
projectInvitationSchema.index({ invitedUser: 1, status: 1 });
projectInvitationSchema.index({ invitedEmail: 1, status: 1 });
projectInvitationSchema.index({ invitedBy: 1 });
projectInvitationSchema.index({ expiresAt: 1 });

// Update the updatedAt field before saving
projectInvitationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get pending invitations for a user
projectInvitationSchema.statics.getPendingInvitations = function(userId) {
  return this.find({
    invitedUser: userId,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  })
    .populate('project', 'name description')
    .populate('invitedBy', 'name email avatar')
    .sort({ createdAt: -1 });
};

// Static method to check if user already has pending invitation
projectInvitationSchema.statics.hasPendingInvitation = function(projectId, userId) {
  return this.findOne({
    project: projectId,
    invitedUser: userId,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  });
};

// Method to accept invitation
projectInvitationSchema.methods.accept = function() {
  this.status = 'accepted';
  this.respondedAt = new Date();
  return this.save();
};

// Method to decline invitation
projectInvitationSchema.methods.decline = function() {
  this.status = 'declined';
  this.respondedAt = new Date();
  return this.save();
};

// Method to check if invitation is expired
projectInvitationSchema.methods.isExpired = function() {
  return this.expiresAt < new Date();
};

module.exports = mongoose.model('ProjectInvitation', projectInvitationSchema);
