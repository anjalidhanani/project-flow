const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const Comment = require('../models/Comment');
const ProjectMember = require('../models/ProjectMember');

// Get dashboard summary
router.get('/dashboard-summary', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's projects
    const userProjects = await ProjectMember.find({ user: userId }).populate('project');
    const projectIds = userProjects.map(pm => pm.project._id);

    // Get statistics
    const totalProjects = projectIds.length;
    const totalTasks = await Task.countDocuments({ project: { $in: projectIds } });
    const completedTasks = await Task.countDocuments({ 
      project: { $in: projectIds }, 
      status: 'completed' 
    });

    // Get active users (users who have been active in projects within the last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeProjectMembers = await ProjectMember.find({
      project: { $in: projectIds },
      lastActivity: { $gte: thirtyDaysAgo },
      status: 'active'
    }).distinct('user');
    const activeUsers = activeProjectMembers.length;

    res.json({
      totalProjects,
      totalTasks,
      completedTasks,
      activeUsers
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ message: 'Error fetching dashboard summary', error: error.message });
  }
});

// Get project progress reports
router.get('/project-progress', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { projectIds } = req.query;

    // Get user's projects
    let userProjects = await ProjectMember.find({ user: userId }).populate('project');
    let targetProjectIds = userProjects.map(pm => pm.project._id);

    // Filter by specific projects if provided
    if (projectIds) {
      const requestedIds = projectIds.split(',');
      targetProjectIds = targetProjectIds.filter(id => 
        requestedIds.includes(id.toString())
      );
    }

    const reports = [];

    for (const projectId of targetProjectIds) {
      const project = await Project.findById(projectId);
      if (!project) continue;

      // Get all tasks for this project
      const allTasks = await Task.find({ project: projectId });
      const totalTasks = allTasks.length;
      
      if (totalTasks === 0) {
        reports.push({
          projectId: project._id,
          projectName: project.name,
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          pendingTasks: 0,
          completionPercentage: 0,
          overdueTasks: 0,
          averageTaskDuration: 0,
          createdAt: project.createdAt,
          deadline: project.deadline
        });
        continue;
      }

      const completedTasks = allTasks.filter(task => task.status === 'completed').length;
      const inProgressTasks = allTasks.filter(task => task.status === 'in_progress').length;
      const pendingTasks = allTasks.filter(task => task.status === 'pending').length;
      
      // Calculate overdue tasks
      const now = new Date();
      const overdueTasks = allTasks.filter(task => 
        task.dueDate && new Date(task.dueDate) < now && task.status !== 'completed'
      ).length;

      // Calculate average task duration for completed tasks
      const completedTasksWithDates = allTasks.filter(task => 
        task.status === 'completed' && task.createdAt && task.updatedAt
      );
      
      let averageTaskDuration = 0;
      if (completedTasksWithDates.length > 0) {
        const totalDuration = completedTasksWithDates.reduce((sum, task) => {
          const duration = (new Date(task.updatedAt) - new Date(task.createdAt)) / (1000 * 60 * 60 * 24);
          return sum + duration;
        }, 0);
        averageTaskDuration = Math.round(totalDuration / completedTasksWithDates.length);
      }

      const completionPercentage = Math.round((completedTasks / totalTasks) * 100);

      reports.push({
        projectId: project._id,
        projectName: project.name,
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        completionPercentage,
        overdueTasks,
        averageTaskDuration,
        createdAt: project.createdAt,
        deadline: project.deadline
      });
    }

    res.json(reports);
  } catch (error) {
    console.error('Error fetching project progress reports:', error);
    res.status(500).json({ message: 'Error fetching project progress reports', error: error.message });
  }
});

// Get task analytics
router.post('/task-analytics', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { dateRange, projectIds, userIds } = req.body;

    // Get user's projects
    let userProjects = await ProjectMember.find({ user: userId }).populate('project');
    let targetProjectIds = userProjects.map(pm => pm.project._id);

    // Filter by specific projects if provided
    if (projectIds && projectIds.length > 0) {
      targetProjectIds = targetProjectIds.filter(id => 
        projectIds.includes(id.toString())
      );
    }

    // Build query
    let query = { project: { $in: targetProjectIds } };
    
    // Add date range filter
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      query.createdAt = {
        $gte: new Date(dateRange.startDate),
        $lte: new Date(dateRange.endDate)
      };
    }

    // Add user filter
    if (userIds && userIds.length > 0) {
      query.assignedTo = { $in: userIds };
    }

    // Get all tasks matching criteria
    const allTasks = await Task.find(query).populate('project', 'name');
    
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(task => task.status === 'completed').length;
    const inProgressTasks = allTasks.filter(task => task.status === 'in_progress').length;
    const pendingTasks = allTasks.filter(task => task.status === 'pending').length;
    
    // Calculate overdue tasks
    const now = new Date();
    const overdueTasks = allTasks.filter(task => 
      task.dueDate && new Date(task.dueDate) < now && task.status !== 'completed'
    ).length;

    // Tasks by priority
    const tasksByPriority = {
      high: allTasks.filter(task => task.priority === 'high').length,
      medium: allTasks.filter(task => task.priority === 'medium').length,
      low: allTasks.filter(task => task.priority === 'low').length
    };

    // Tasks by project
    const projectTaskCounts = {};
    allTasks.forEach(task => {
      const projectName = task.project.name;
      const projectId = task.project._id.toString();
      if (!projectTaskCounts[projectId]) {
        projectTaskCounts[projectId] = { projectId, projectName, taskCount: 0 };
      }
      projectTaskCounts[projectId].taskCount++;
    });

    const tasksByProject = Object.values(projectTaskCounts);

    // Calculate average completion time
    const completedTasksWithDates = allTasks.filter(task => 
      task.status === 'completed' && task.createdAt && task.updatedAt
    );
    
    let averageCompletionTime = 0;
    if (completedTasksWithDates.length > 0) {
      const totalDuration = completedTasksWithDates.reduce((sum, task) => {
        const duration = (new Date(task.updatedAt) - new Date(task.createdAt)) / (1000 * 60 * 60 * 24);
        return sum + duration;
      }, 0);
      averageCompletionTime = Math.round(totalDuration / completedTasksWithDates.length);
    }

    // Productivity trends (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const productivityTrends = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const tasksCreated = await Task.countDocuments({
        project: { $in: targetProjectIds },
        createdAt: { $gte: dayStart, $lte: dayEnd }
      });
      
      const tasksCompleted = await Task.countDocuments({
        project: { $in: targetProjectIds },
        status: 'completed',
        updatedAt: { $gte: dayStart, $lte: dayEnd }
      });
      
      productivityTrends.push({
        date: dateStr,
        tasksCreated,
        tasksCompleted
      });
    }

    res.json({
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      overdueTasks,
      tasksByPriority,
      tasksByProject,
      averageCompletionTime,
      productivityTrends
    });
  } catch (error) {
    console.error('Error fetching task analytics:', error);
    res.status(500).json({ message: 'Error fetching task analytics', error: error.message });
  }
});

// Get user activity reports
router.get('/user-activity', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { userIds } = req.query;

    // Get user's projects
    const userProjects = await ProjectMember.find({ user: userId }).populate('project');
    const projectIds = userProjects.map(pm => pm.project._id);

    // Get all project members from user's projects
    let projectMembers = await ProjectMember.find({ 
      project: { $in: projectIds } 
    }).populate('user', 'name email lastLogin');

    // Remove duplicate users (same user can be in multiple projects)
    const uniqueUsers = new Map();
    projectMembers.forEach(member => {
      if (member.user && !uniqueUsers.has(member.user._id.toString())) {
        uniqueUsers.set(member.user._id.toString(), member.user);
      }
    });

    // Filter by specific users if provided
    let usersToProcess = Array.from(uniqueUsers.values());
    if (userIds) {
      const requestedUserIds = userIds.split(',');
      usersToProcess = usersToProcess.filter(user => 
        requestedUserIds.includes(user._id.toString())
      );
    }

    const reports = [];

    for (const user of usersToProcess) {
      if (!user) continue;

      // Get tasks assigned to this user
      const assignedTasks = await Task.find({ 
        assignedTo: user._id,
        project: { $in: projectIds }
      });

      const tasksAssigned = assignedTasks.length;
      const tasksCompleted = assignedTasks.filter(task => task.status === 'completed').length;

      // Get projects this user is involved in
      const userProjectMemberships = await ProjectMember.find({ user: user._id });
      const projectsInvolved = userProjectMemberships.length;

      // Get comments posted by this user
      const commentsPosted = await Comment.countDocuments({ 
        author: user._id,
        project: { $in: projectIds }
      });

      // Calculate productivity score (simple formula)
      let productivityScore = 0;
      if (tasksAssigned > 0) {
        const completionRate = (tasksCompleted / tasksAssigned) * 100;
        const activityBonus = Math.min(commentsPosted * 2, 20); // Max 20 points for activity
        productivityScore = Math.min(Math.round(completionRate + activityBonus), 100);
      }

      // Generate activity timeline (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const recentTasks = await Task.find({
        assignedTo: user._id,
        project: { $in: projectIds },
        updatedAt: { $gte: thirtyDaysAgo }
      }).populate('project', 'name').sort({ updatedAt: -1 }).limit(10);

      const recentComments = await Comment.find({
        author: user._id,
        project: { $in: projectIds },
        createdAt: { $gte: thirtyDaysAgo }
      }).populate('project', 'name').sort({ createdAt: -1 }).limit(5);

      const activityTimeline = [];

      // Add task activities
      recentTasks.forEach(task => {
        activityTimeline.push({
          date: task.updatedAt,
          activityType: task.status === 'completed' ? 'task_completed' : 'task_updated',
          description: `${task.status === 'completed' ? 'Completed' : 'Updated'} task "${task.title}" in ${task.project.name}`
        });
      });

      // Add comment activities
      recentComments.forEach(comment => {
        activityTimeline.push({
          date: comment.createdAt,
          activityType: 'comment_added',
          description: `Added comment in ${comment.project.name}`
        });
      });

      // Sort by date
      activityTimeline.sort((a, b) => new Date(b.date) - new Date(a.date));

      reports.push({
        userId: user._id,
        userName: user.name,
        tasksAssigned,
        tasksCompleted,
        projectsInvolved,
        commentsPosted,
        lastActivity: user.lastLogin || user.updatedAt,
        productivityScore,
        activityTimeline: activityTimeline.slice(0, 15) // Limit to 15 most recent activities
      });
    }

    res.json(reports);
  } catch (error) {
    console.error('Error fetching user activity reports:', error);
    res.status(500).json({ message: 'Error fetching user activity reports', error: error.message });
  }
});

// Generate custom report
router.post('/custom', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { dateRange, projectIds, userIds, taskStatuses, priorities } = req.body;

    // Get user's projects
    let userProjects = await ProjectMember.find({ user: userId }).populate('project');
    let targetProjectIds = userProjects.map(pm => pm.project._id);

    // Filter by specific projects if provided
    if (projectIds && projectIds.length > 0) {
      targetProjectIds = targetProjectIds.filter(id => 
        projectIds.includes(id.toString())
      );
    }

    // Build query
    let query = { project: { $in: targetProjectIds } };
    
    // Add date range filter
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      query.createdAt = {
        $gte: new Date(dateRange.startDate),
        $lte: new Date(dateRange.endDate)
      };
    }

    // Add user filter
    if (userIds && userIds.length > 0) {
      query.assignedTo = { $in: userIds };
    }

    // Add status filter
    if (taskStatuses && taskStatuses.length > 0) {
      query.status = { $in: taskStatuses };
    }

    // Add priority filter
    if (priorities && priorities.length > 0) {
      query.priority = { $in: priorities };
    }

    // Get filtered tasks
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .populate('project', 'name')
      .sort({ createdAt: -1 });

    // Generate summary statistics
    const summary = {
      totalTasks: tasks.length,
      tasksByStatus: {
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length
      },
      tasksByPriority: {
        high: tasks.filter(t => t.priority === 'high').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        low: tasks.filter(t => t.priority === 'low').length
      },
      projectBreakdown: {}
    };

    // Calculate project breakdown
    tasks.forEach(task => {
      const projectName = task.project.name;
      if (!summary.projectBreakdown[projectName]) {
        summary.projectBreakdown[projectName] = 0;
      }
      summary.projectBreakdown[projectName]++;
    });

    res.json({
      summary,
      tasks: tasks.map(task => ({
        id: task._id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignedTo: task.assignedTo ? {
          id: task.assignedTo._id,
          name: task.assignedTo.name,
          email: task.assignedTo.email
        } : null,
        project: {
          id: task.project._id,
          name: task.project.name
        },
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      })),
      filters: {
        dateRange,
        projectIds,
        userIds,
        taskStatuses,
        priorities
      },
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error generating custom report:', error);
    res.status(500).json({ message: 'Error generating custom report', error: error.message });
  }
});

// Export report (placeholder - would need additional libraries for PDF/CSV generation)
router.post('/export', auth, async (req, res) => {
  try {
    const { reportType, format, filters } = req.body;

    // This is a placeholder implementation
    // In a real application, you would use libraries like:
    // - PDFKit or Puppeteer for PDF generation
    // - csv-writer or json2csv for CSV generation

    if (format === 'csv') {
      // Generate CSV content
      const csvContent = 'Report Type,Generated At\n' + 
                        `${reportType},${new Date().toISOString()}`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report.csv"`);
      res.send(csvContent);
    } else if (format === 'pdf') {
      // Generate PDF content (placeholder)
      const pdfContent = `Report: ${reportType}\nGenerated: ${new Date().toISOString()}`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report.pdf"`);
      res.send(Buffer.from(pdfContent));
    } else {
      res.status(400).json({ message: 'Unsupported export format' });
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ message: 'Error exporting report', error: error.message });
  }
});

module.exports = router;
