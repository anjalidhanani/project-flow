const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const TaskComment = require('../models/TaskComment');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/tasks
// @desc    Get user's tasks
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, priority, assignedTo, project, page = 1, limit = 20 } = req.query;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo === 'me') filter.assignedTo = req.user._id;
    if (project) filter.project = project;

    // Get user's project IDs
    const userProjects = await ProjectMember.find({ 
      user: req.user._id, 
      status: 'active' 
    }).select('project');
    
    const projectIds = userProjects.map(mp => mp.project);
    
    // Only filter by user's projects if no specific project is requested
    if (!filter.project) {
      filter.project = { $in: projectIds };
    } else {
      // Ensure the requested project is one the user has access to
      if (!projectIds.some(id => id.toString() === filter.project.toString())) {
        return res.status(403).json({ message: 'Access denied to this project' });
      }
    }

    const tasks = await Task.find(filter)
      .populate('project', 'name color')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(filter);

    res.json({
      tasks,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post('/', [
  auth,
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Task title must be between 1 and 100 characters'),
  body('project')
    .isMongoId()
    .withMessage('Valid project ID is required'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { title, description, project, assignedTo, priority, dueDate, estimatedHours, tags } = req.body;

    // Check if user has permission to create tasks in this project
    const membership = await ProjectMember.findOne({
      project,
      user: req.user._id,
      status: 'active'
    });

    if (!membership || !membership.permissions.canCreateTasks) {
      return res.status(403).json({ message: 'Permission denied to create tasks in this project' });
    }

    // Handle empty assignedTo field - convert empty string to null/undefined
    let validAssignedTo = assignedTo;
    if (assignedTo === '' || assignedTo === null) {
      validAssignedTo = undefined;
    }

    // Validate assignedTo user is a project member (only if assignedTo is provided)
    if (validAssignedTo) {
      const assigneeMembership = await ProjectMember.findOne({
        project,
        user: validAssignedTo,
        status: 'active'
      });

      if (!assigneeMembership) {
        return res.status(400).json({ message: 'Assigned user is not a member of this project' });
      }
    }

    // Create task data object
    const taskData = {
      title,
      description,
      project,
      createdBy: req.user._id,
      priority: priority || 'medium',
      dueDate,
      estimatedHours: estimatedHours || 0,
      tags: tags || []
    };

    // Only add assignedTo if it has a valid value
    if (validAssignedTo) {
      taskData.assignedTo = validAssignedTo;
    }

    // Create task
    const task = new Task(taskData);

    await task.save();

    // Populate references
    await task.populate([
      { path: 'project', select: 'name color' },
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' }
    ]);

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error during task creation' });
  }
});

// @route   GET /api/tasks/:id
// @desc    Get task details
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const taskId = req.params.id;

    const task = await Task.findById(taskId)
      .populate('project', 'name color')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to this task's project
    const membership = await ProjectMember.findOne({
      project: task.project._id,
      user: req.user._id,
      status: 'active'
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied to this task' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Private
router.put('/:id', [
  auth,
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Task title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const taskId = req.params.id;
    const { title, description, status, priority, assignedTo, dueDate, estimatedHours, actualHours, tags } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has permission to edit tasks in this project
    const membership = await ProjectMember.findOne({
      project: task.project,
      user: req.user._id,
      status: 'active'
    });

    if (!membership || !membership.permissions.canEditTasks) {
      return res.status(403).json({ message: 'Permission denied to edit this task' });
    }

    // Handle empty assignedTo field - convert empty string to null
    let validAssignedTo = assignedTo;
    if (assignedTo === '') {
      validAssignedTo = null;
    }

    // Validate assignedTo user is a project member (only if assignedTo is provided and not empty)
    if (validAssignedTo && validAssignedTo !== null) {
      const assigneeMembership = await ProjectMember.findOne({
        project: task.project,
        user: validAssignedTo,
        status: 'active'
      });

      if (!assigneeMembership) {
        return res.status(400).json({ message: 'Assigned user is not a member of this project' });
      }
    }

    // Prepare update object
    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = validAssignedTo;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;
    if (actualHours !== undefined) updateData.actualHours = actualHours;
    if (tags) updateData.tags = tags;

    // Update task
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'project', select: 'name color' },
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' }
    ]);

    res.json({
      message: 'Task updated successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error during task update' });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete task
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const taskId = req.params.id;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has permission to delete tasks in this project
    const membership = await ProjectMember.findOne({
      project: task.project,
      user: req.user._id,
      status: 'active'
    });

    if (!membership || !membership.permissions.canDeleteTasks) {
      return res.status(403).json({ message: 'Permission denied to delete this task' });
    }

    await Task.findByIdAndDelete(taskId);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error during task deletion' });
  }
});

// @route   GET /api/projects/:projectId/tasks
// @desc    Get project tasks
// @access  Private
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, assignedTo } = req.query;

    // Check if user has access to this project
    const membership = await ProjectMember.findOne({
      project: projectId,
      user: req.user._id,
      status: 'active'
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    // Build filter
    const filter = { project: projectId };
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort({ position: 1, createdAt: -1 });

    // Group tasks by status for kanban view
    const tasksByStatus = {
      todo: tasks.filter(task => task.status === 'todo'),
      'in-progress': tasks.filter(task => task.status === 'in-progress'),
      review: tasks.filter(task => task.status === 'review'),
      completed: tasks.filter(task => task.status === 'completed')
    };

    res.json({
      tasks,
      tasksByStatus,
      total: tasks.length
    });
  } catch (error) {
    console.error('Get project tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/tasks/:id/position
// @desc    Update task position (for drag and drop)
// @access  Private
router.put('/:id/position', [
  auth,
  body('position')
    .isNumeric()
    .withMessage('Position must be a number'),
  body('status')
    .optional()
    .isIn(['todo', 'in-progress', 'review', 'completed'])
    .withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const taskId = req.params.id;
    const { position, status } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has permission to edit tasks
    const membership = await ProjectMember.findOne({
      project: task.project,
      user: req.user._id,
      status: 'active'
    });

    if (!membership || !membership.permissions.canEditTasks) {
      return res.status(403).json({ message: 'Permission denied to edit this task' });
    }

    // Update task position and status
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { 
        position,
        ...(status && { status })
      },
      { new: true }
    );

    res.json({
      message: 'Task position updated successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Update task position error:', error);
    res.status(500).json({ message: 'Server error during task position update' });
  }
});

// @route   GET /api/tasks/:id/comments
// @desc    Get comments for a task
// @access  Private
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const taskId = req.params.id;

    // Check if task exists and user has access
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to the project
    const membership = await ProjectMember.findOne({
      project: task.project,
      user: req.user._id,
      status: 'active'
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied to this task' });
    }

    const comments = await TaskComment.getTaskComments(taskId);
    res.json({ comments });
  } catch (error) {
    console.error('Get task comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/tasks/:id/comments
// @desc    Add comment to a task
// @access  Private
router.post('/:id/comments', [
  auth,
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const taskId = req.params.id;
    const { content } = req.body;

    // Check if task exists and user has access
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to the project
    const membership = await ProjectMember.findOne({
      project: task.project,
      user: req.user._id,
      status: 'active'
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied to this task' });
    }

    const comment = new TaskComment({
      content,
      author: req.user._id,
      task: taskId
    });

    await comment.save();
    await comment.populate('author', 'name email avatar');

    res.status(201).json({
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    console.error('Add task comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/tasks/:id/comments/:commentId
// @desc    Update a task comment
// @access  Private
router.put('/:id/comments/:commentId', [
  auth,
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id: taskId, commentId } = req.params;
    const { content } = req.body;

    // Check if task exists and user has access
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to the project
    const membership = await ProjectMember.findOne({
      project: task.project,
      user: req.user._id,
      status: 'active'
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied to this task' });
    }

    // Find the comment and populate author for permission check
    const comment = await TaskComment.findById(commentId).populate('author', '_id');
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the author of the comment
    if (!comment.canEdit(req.user._id)) {
      return res.status(403).json({ message: 'You can only edit your own comments' });
    }

    comment.content = content;
    await comment.save();
    await comment.populate('author', 'name email avatar');

    res.json({
      message: 'Comment updated successfully',
      comment
    });
  } catch (error) {
    console.error('Update task comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/tasks/:id/comments/:commentId
// @desc    Delete a task comment
// @access  Private
router.delete('/:id/comments/:commentId', auth, async (req, res) => {
  try {
    const { id: taskId, commentId } = req.params;

    // Check if task exists and user has access
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to the project
    const membership = await ProjectMember.findOne({
      project: task.project,
      user: req.user._id,
      status: 'active'
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied to this task' });
    }

    // Find the comment
    const comment = await TaskComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the author of the comment or has admin/owner permissions
    const canDelete = comment.canEdit(req.user._id) || 
                     membership.role === 'owner' || 
                     membership.role === 'admin';

    if (!canDelete) {
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }

    await TaskComment.findByIdAndDelete(commentId);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete task comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
