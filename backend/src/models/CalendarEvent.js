const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  allDay: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['event', 'task', 'deadline'],
    default: 'event'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  location: {
    type: String,
    trim: true,
    maxlength: 200
  },
  color: {
    type: String,
    default: '#6b7280'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrenceRule: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'notification'],
      default: 'notification'
    },
    minutesBefore: {
      type: Number,
      default: 15
    }
  }],
  isPrivate: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
calendarEventSchema.index({ startDate: 1, endDate: 1 });
calendarEventSchema.index({ createdBy: 1, startDate: 1 });
calendarEventSchema.index({ project: 1, startDate: 1 });
calendarEventSchema.index({ attendees: 1, startDate: 1 });

// Virtual for duration
calendarEventSchema.virtual('duration').get(function() {
  return this.endDate - this.startDate;
});

// Pre-save middleware to validate dates
calendarEventSchema.pre('save', function(next) {
  if (this.startDate >= this.endDate) {
    next(new Error('End date must be after start date'));
  }
  next();
});

// Method to check if event is happening now
calendarEventSchema.methods.isHappeningNow = function() {
  const now = new Date();
  return now >= this.startDate && now <= this.endDate;
};

// Method to check if event is upcoming
calendarEventSchema.methods.isUpcoming = function() {
  const now = new Date();
  return this.startDate > now;
};

// Method to check if event is past
calendarEventSchema.methods.isPast = function() {
  const now = new Date();
  return this.endDate < now;
};

// Static method to find events in date range
calendarEventSchema.statics.findInDateRange = function(startDate, endDate, userId) {
  return this.find({
    $and: [
      {
        $or: [
          { startDate: { $gte: startDate, $lte: endDate } },
          { endDate: { $gte: startDate, $lte: endDate } },
          { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
        ]
      },
      {
        $or: [
          // User's own events (private or public)
          { createdBy: userId },
          // Events where user is an attendee (private or public)
          { attendees: userId },
          // Public events from other users
          { 
            $and: [
              { isPrivate: { $ne: true } },
              { createdBy: { $ne: userId } }
            ]
          }
        ]
      }
    ]
  }).populate('createdBy', 'name email avatar')
    .populate('attendees', 'name email avatar')
    .populate('project', 'name color')
    .populate('task', 'title status priority')
    .sort({ startDate: 1 });
};

// Static method to find user's events
calendarEventSchema.statics.findUserEvents = function(userId, startDate, endDate) {
  const query = {
    $and: [
      {
        $or: [
          // User's own events (private or public)
          { createdBy: userId },
          // Events where user is an attendee (private or public)
          { attendees: userId },
          // Public events from other users
          { 
            $and: [
              { isPrivate: { $ne: true } },
              { createdBy: { $ne: userId } }
            ]
          }
        ]
      }
    ]
  };

  if (startDate && endDate) {
    query.$and.push({
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
      ]
    });
  }

  return this.find(query)
    .populate('createdBy', 'name email avatar')
    .populate('attendees', 'name email avatar')
    .populate('project', 'name color')
    .populate('task', 'title status priority')
    .sort({ startDate: 1 });
};

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
