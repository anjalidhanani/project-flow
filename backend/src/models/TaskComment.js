const mongoose = require('mongoose');

const taskCommentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Comment author is required']
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: [true, 'Task reference is required']
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
taskCommentSchema.index({ task: 1, createdAt: -1 });
taskCommentSchema.index({ author: 1 });

// Virtual for comment age
taskCommentSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

// Pre-save middleware to set editedAt when content is modified
taskCommentSchema.pre('save', function(next) {
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  next();
});

// Static method to get comments for a task
taskCommentSchema.statics.getTaskComments = async function(taskId) {
  return this.find({ task: taskId })
    .populate('author', 'name email avatar')
    .sort({ createdAt: 1 })
    .exec();
};

// Instance method to check if user can edit this comment
taskCommentSchema.methods.canEdit = function(userId) {
  return this.author._id.toString() === userId.toString();
};

module.exports = mongoose.model('TaskComment', taskCommentSchema);
