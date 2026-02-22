const express = require('express');
const { body, validationResult } = require('express-validator');
const Comment = require('../models/Comment');
const Task = require('../models/Task');
const ProjectMember = require('../models/ProjectMember');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/comments/task/:taskId
// @desc    Get comments for a task
// @access  Private
router.get('/task/:taskId', auth, async (req, res) => {
  try {
    const { taskId } = req.params;

    // Get task and verify access
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to this project
    const membership = await ProjectMember.findOne({
      project: task.project,
      user: req.user._id,
      status: 'active'
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied to this task' });
    }

    // Get comments
    const comments = await Comment.find({ 
      task: taskId, 
      isDeleted: false 
    })
      .populate('author', 'name email avatar')
      .populate('mentions.user', 'name email')
      .sort({ createdAt: 1 });

    // Build comment tree (parent-child relationships)
    const commentMap = {};
    const rootComments = [];

    comments.forEach(comment => {
      commentMap[comment._id] = {
        ...comment.toObject(),
        replies: []
      };
    });

    comments.forEach(comment => {
      if (comment.parentComment) {
        if (commentMap[comment.parentComment]) {
          commentMap[comment.parentComment].replies.push(commentMap[comment._id]);
        }
      } else {
        rootComments.push(commentMap[comment._id]);
      }
    });

    res.json({
      comments: rootComments,
      total: comments.length
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/comments
// @desc    Create a new comment
// @access  Private
router.post('/', [
  auth,
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment content must be between 1 and 1000 characters'),
  body('task')
    .isMongoId()
    .withMessage('Valid task ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { content, task, parentComment, mentions } = req.body;

    // Get task and verify access
    const taskDoc = await Task.findById(task);
    if (!taskDoc) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has permission to comment
    const membership = await ProjectMember.findOne({
      project: taskDoc.project,
      user: req.user._id,
      status: 'active'
    });

    if (!membership || !membership.permissions.canComment) {
      return res.status(403).json({ message: 'Permission denied to comment on this task' });
    }

    // Validate parent comment if provided
    if (parentComment) {
      const parentCommentDoc = await Comment.findById(parentComment);
      if (!parentCommentDoc || parentCommentDoc.task.toString() !== task) {
        return res.status(400).json({ message: 'Invalid parent comment' });
      }
    }

    // Create comment
    const comment = new Comment({
      content,
      author: req.user._id,
      task,
      project: taskDoc.project,
      parentComment,
      mentions: mentions || []
    });

    await comment.save();

    // Populate author details
    await comment.populate('author', 'name email avatar');

    res.status(201).json({
      message: 'Comment created successfully',
      comment
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Server error during comment creation' });
  }
});

// @route   PUT /api/comments/:id
// @desc    Update comment
// @access  Private
router.put('/:id', [
  auth,
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment content must be between 1 and 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const commentId = req.params.id;
    const { content } = req.body;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the author of the comment
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Permission denied to edit this comment' });
    }

    // Update comment
    comment.content = content;
    await comment.save();

    await comment.populate('author', 'name email avatar');

    res.json({
      message: 'Comment updated successfully',
      comment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ message: 'Server error during comment update' });
  }
});

// @route   DELETE /api/comments/:id
// @desc    Delete comment (soft delete)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const commentId = req.params.id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the author or has admin permissions
    const isAuthor = comment.author.toString() === req.user._id.toString();
    
    let hasAdminPermission = false;
    if (!isAuthor) {
      const membership = await ProjectMember.findOne({
        project: comment.project,
        user: req.user._id,
        status: 'active'
      });
      hasAdminPermission = membership && (membership.role === 'owner' || membership.role === 'admin');
    }

    if (!isAuthor && !hasAdminPermission) {
      return res.status(403).json({ message: 'Permission denied to delete this comment' });
    }

    // Soft delete comment
    await comment.softDelete();

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error during comment deletion' });
  }
});

// @route   GET /api/comments/project/:projectId
// @desc    Get recent comments for a project
// @access  Private
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 20 } = req.query;

    // Check if user has access to this project
    const membership = await ProjectMember.findOne({
      project: projectId,
      user: req.user._id,
      status: 'active'
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    // Get recent comments
    const comments = await Comment.find({ 
      project: projectId, 
      isDeleted: false 
    })
      .populate('author', 'name email avatar')
      .populate('task', 'title')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      comments,
      total: comments.length
    });
  } catch (error) {
    console.error('Get project comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
