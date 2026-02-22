const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: [
      'project_invitation',
      'task_assigned',
      'task_updated',
      'comment_added',
      'project_updated',
      'member_added',
      'member_removed',
      'deadline_reminder'
    ],
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  actionUrl: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  expiresAt: {
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

// Indexes for better query performance
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 });

// Update the updatedAt field before saving
notificationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to get unread notifications for a user
notificationSchema.statics.getUnreadNotifications = function(userId, limit = 50) {
  return this.find({
    recipient: userId,
    isRead: false,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  })
    .populate('sender', 'name email avatar')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get all notifications for a user
notificationSchema.statics.getUserNotifications = function(userId, limit = 100, skip = 0) {
  return this.find({
    recipient: userId,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  })
    .populate('sender', 'name email avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to mark all notifications as read for a user
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { recipient: userId, isRead: false },
    { 
      isRead: true, 
      readAt: new Date(),
      updatedAt: new Date()
    }
  );
};

// Static method to create project invitation notification
notificationSchema.statics.createProjectInvitation = function(data) {
  return this.create({
    recipient: data.invitedUser,
    sender: data.invitedBy,
    type: 'project_invitation',
    title: `Project Invitation: ${data.projectName}`,
    message: `${data.inviterName} invited you to join the project "${data.projectName}" as a ${data.role}.`,
    data: {
      projectId: data.projectId,
      invitationId: data.invitationId,
      role: data.role,
      status: 'pending'
    },
    actionUrl: `/projects/${data.projectId}`,
    priority: 'high',
    expiresAt: data.expiresAt
  });
};

module.exports = mongoose.model('Notification', notificationSchema);
