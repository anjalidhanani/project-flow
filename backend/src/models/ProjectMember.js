const mongoose = require('mongoose');

const projectMemberSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'manager', 'developer', 'viewer'],
    default: 'developer'
  },
  permissions: {
    canEditProject: {
      type: Boolean,
      default: false
    },
    canDeleteProject: {
      type: Boolean,
      default: false
    },
    canManageMembers: {
      type: Boolean,
      default: false
    },
    canCreateTasks: {
      type: Boolean,
      default: true
    },
    canEditTasks: {
      type: Boolean,
      default: true
    },
    canDeleteTasks: {
      type: Boolean,
      default: false
    },
    canComment: {
      type: Boolean,
      default: true
    }
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'removed'],
    default: 'active'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
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

// Compound index to ensure unique user-project combination
projectMemberSchema.index({ project: 1, user: 1 }, { unique: true });
projectMemberSchema.index({ user: 1, status: 1 });
projectMemberSchema.index({ project: 1, role: 1 });
projectMemberSchema.index({ joinedAt: -1 });

// Set permissions based on role
projectMemberSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    switch (this.role) {
      case 'owner':
        this.permissions = {
          canEditProject: true,
          canDeleteProject: true,
          canManageMembers: true,
          canCreateTasks: true,
          canEditTasks: true,
          canDeleteTasks: true,
          canComment: true
        };
        break;
      case 'admin':
        this.permissions = {
          canEditProject: true,
          canDeleteProject: true,
          canManageMembers: true,
          canCreateTasks: true,
          canEditTasks: true,
          canDeleteTasks: true,
          canComment: true
        };
        break;
      case 'manager':
        this.permissions = {
          canEditProject: true,
          canDeleteProject: false,
          canManageMembers: false,
          canCreateTasks: true,
          canEditTasks: true,
          canDeleteTasks: false,
          canComment: true
        };
        break;
      case 'developer':
        this.permissions = {
          canEditProject: false,
          canDeleteProject: false,
          canManageMembers: false,
          canCreateTasks: true,
          canEditTasks: true,
          canDeleteTasks: false,
          canComment: true
        };
        break;
      case 'viewer':
        this.permissions = {
          canEditProject: false,
          canDeleteProject: false,
          canManageMembers: false,
          canCreateTasks: false,
          canEditTasks: false,
          canDeleteTasks: false,
          canComment: true
        };
        break;
    }
  }
  this.updatedAt = Date.now();
  next();
});

// Method to update last activity
projectMemberSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

// Static method to get project members with user details
projectMemberSchema.statics.getProjectMembers = function(projectId) {
  return this.find({ project: projectId, status: 'active' })
    .populate('user', 'name email avatar role')
    .populate('invitedBy', 'name email')
    .sort({ joinedAt: 1 });
};

// Static method to get user projects
projectMemberSchema.statics.getUserProjects = function(userId) {
  return this.find({ user: userId, status: 'active' })
    .populate('project')
    .sort({ joinedAt: -1 });
};

module.exports = mongoose.model('ProjectMember', projectMemberSchema);
