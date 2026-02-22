const express = require('express');
const router = express.Router();
const CalendarEvent = require('../models/CalendarEvent');
const Task = require('../models/Task');
const { auth } = require('../middleware/auth');
const { body, validationResult, query } = require('express-validator');

// Get calendar events
router.get('/', [
  auth,
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  query('project').optional().isMongoId().withMessage('Project ID must be valid'),
  query('includeTaskDeadlines').optional().isBoolean().withMessage('Include task deadlines must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, project, includeTaskDeadlines = 'true' } = req.query;
    const userId = req.user.id;

    let events = [];

    // Get calendar events
    if (startDate && endDate) {
      events = await CalendarEvent.findInDateRange(
        new Date(startDate),
        new Date(endDate),
        userId
      );
    } else {
      events = await CalendarEvent.findUserEvents(userId, 
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
      );
    }

    // Include task deadlines if requested
    if (includeTaskDeadlines === 'true') {
      const taskQuery = {
        $or: [
          { createdBy: userId },
          { assignedTo: userId }
        ],
        dueDate: { $exists: true, $ne: null },
        status: { $ne: 'completed' }
      };

      if (startDate && endDate) {
        taskQuery.dueDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      if (project) {
        taskQuery.project = project;
      }

      const tasks = await Task.find(taskQuery)
        .populate('project', 'name color')
        .populate('assignedTo', 'name email avatar')
        .populate('createdBy', 'name email avatar');

      // Convert tasks to calendar events
      const taskEvents = tasks.map(task => ({
        _id: `task-${task._id}`,
        title: task.title,
        description: task.description,
        startDate: task.dueDate,
        endDate: task.dueDate,
        allDay: true,
        type: 'task',
        project: task.project,
        task: {
          _id: task._id,
          title: task.title,
          status: task.status,
          priority: task.priority
        },
        createdBy: task.createdBy,
        color: getTaskPriorityColor(task.priority),
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }));

      events = [...events, ...taskEvents];
    }

    // Sort events by start date
    events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    res.json({ events });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single calendar event
router.get('/:id', [auth], async (req, res) => {
  try {
    const event = await CalendarEvent.findById(req.params.id)
      .populate('createdBy', 'name email avatar')
      .populate('attendees', 'name email avatar')
      .populate('project', 'name color')
      .populate('task', 'title status priority');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user has access to this event
    const userId = req.user.id;
    const hasAccess = event.createdBy._id.toString() === userId ||
                     event.attendees.some(attendee => attendee._id.toString() === userId) ||
                     !event.isPrivate;

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ event });
  } catch (error) {
    console.error('Error fetching calendar event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create calendar event
router.post('/', [
  auth,
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('startDate').isISO8601().withMessage('Start date is required and must be a valid date'),
  body('endDate').isISO8601().withMessage('End date is required and must be a valid date'),
  body('allDay').optional().isBoolean().withMessage('All day must be boolean'),
  body('project').optional().isMongoId().withMessage('Project ID must be valid'),
  body('attendees').optional().isArray().withMessage('Attendees must be an array'),
  body('attendees.*').optional().isMongoId().withMessage('Each attendee must be a valid user ID'),
  body('location').optional().trim().isLength({ max: 200 }).withMessage('Location must be less than 200 characters'),
  body('color').optional().isHexColor().withMessage('Color must be a valid hex color'),
  body('isRecurring').optional().isBoolean().withMessage('Is recurring must be boolean'),
  body('recurrenceRule').optional().isString().withMessage('Recurrence rule must be a string'),
  body('isPrivate').optional().isBoolean().withMessage('Is private must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      startDate,
      endDate,
      allDay = false,
      project,
      attendees = [],
      location,
      color = '#6b7280',
      isRecurring = false,
      recurrenceRule,
      isPrivate = false
    } = req.body;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const event = new CalendarEvent({
      title,
      description,
      startDate: start,
      endDate: end,
      allDay,
      project,
      createdBy: req.user.id,
      attendees,
      location,
      color,
      isRecurring,
      recurrenceRule,
      isPrivate
    });

    await event.save();

    await event.populate([
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'attendees', select: 'name email avatar' },
      { path: 'project', select: 'name color' }
    ]);

    res.status(201).json({
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update calendar event
router.put('/:id', [
  auth,
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be less than 200 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  body('allDay').optional().isBoolean().withMessage('All day must be boolean'),
  body('project').optional().isMongoId().withMessage('Project ID must be valid'),
  body('attendees').optional().isArray().withMessage('Attendees must be an array'),
  body('attendees.*').optional().isMongoId().withMessage('Each attendee must be a valid user ID'),
  body('location').optional().trim().isLength({ max: 200 }).withMessage('Location must be less than 200 characters'),
  body('color').optional().isHexColor().withMessage('Color must be a valid hex color'),
  body('status').optional().isIn(['scheduled', 'in-progress', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('isPrivate').optional().isBoolean().withMessage('Is private must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const event = await CalendarEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user can edit this event
    const userId = req.user.id;
    if (event.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updates = req.body;

    // Validate dates if both are provided
    if (updates.startDate && updates.endDate) {
      const start = new Date(updates.startDate);
      const end = new Date(updates.endDate);
      
      if (start >= end) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }
    }

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        event[key] = updates[key];
      }
    });

    await event.save();

    await event.populate([
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'attendees', select: 'name email avatar' },
      { path: 'project', select: 'name color' }
    ]);

    res.json({
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete calendar event
router.delete('/:id', [auth], async (req, res) => {
  try {
    const event = await CalendarEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user can delete this event
    const userId = req.user.id;
    if (event.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await CalendarEvent.findByIdAndDelete(req.params.id);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get upcoming events for dashboard
router.get('/upcoming/summary', [auth], async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const events = await CalendarEvent.findUserEvents(userId, now, nextWeek);
    
    // Get upcoming task deadlines
    const tasks = await Task.find({
      $or: [
        { createdBy: userId },
        { assignedTo: userId }
      ],
      dueDate: { $gte: now, $lte: nextWeek },
      status: { $ne: 'completed' }
    }).populate('project', 'name color')
      .populate('assignedTo', 'name email avatar')
      .limit(5);

    const taskEvents = tasks.map(task => ({
      _id: `task-${task._id}`,
      title: task.title,
      startDate: task.dueDate,
      type: 'task',
      project: task.project,
      priority: task.priority
    }));

    const allEvents = [...events, ...taskEvents]
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .slice(0, 5);

    res.json({ events: allEvents });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to get task priority color
function getTaskPriorityColor(priority) {
  const colors = {
    'urgent': '#ef4444',
    'high': '#f97316',
    'medium': '#eab308',
    'low': '#22c55e'
  };
  return colors[priority] || '#6b7280';
}

module.exports = router;
