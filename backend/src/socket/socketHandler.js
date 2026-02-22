const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ProjectMember = require('../models/ProjectMember');

const socketHandler = (io) => {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user || !user.isActive) {
        return next(new Error('Authentication error'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.name} connected: ${socket.id}`);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Handle joining project rooms
    socket.on('join-project', async (projectId) => {
      try {
        // Verify user is a member of the project
        const membership = await ProjectMember.findOne({
          project: projectId,
          user: socket.userId,
          status: 'active'
        });

        if (membership) {
          socket.join(`project:${projectId}`);
          
          // Update user's last activity
          await membership.updateActivity();
          
          // Notify other project members
          socket.to(`project:${projectId}`).emit('user-joined-project', {
            user: {
              id: socket.user._id,
              name: socket.user.name,
              avatar: socket.user.avatar
            },
            projectId,
            timestamp: new Date()
          });

          console.log(`User ${socket.user.name} joined project ${projectId}`);
        }
      } catch (error) {
        console.error('Join project error:', error);
        socket.emit('error', { message: 'Failed to join project' });
      }
    });

    // Handle leaving project rooms
    socket.on('leave-project', (projectId) => {
      socket.leave(`project:${projectId}`);
      
      // Notify other project members
      socket.to(`project:${projectId}`).emit('user-left-project', {
        user: {
          id: socket.user._id,
          name: socket.user.name
        },
        projectId,
        timestamp: new Date()
      });

      console.log(`User ${socket.user.name} left project ${projectId}`);
    });

    // Handle task updates
    socket.on('task-updated', async (data) => {
      try {
        const { taskId, projectId, updates, action } = data;

        // Verify user has permission to update tasks in this project
        const membership = await ProjectMember.findOne({
          project: projectId,
          user: socket.userId,
          status: 'active'
        });

        if (membership && membership.permissions.canEditTasks) {
          // Broadcast task update to all project members
          socket.to(`project:${projectId}`).emit('task-updated', {
            taskId,
            projectId,
            updates,
            action, // 'created', 'updated', 'deleted', 'status-changed'
            updatedBy: {
              id: socket.user._id,
              name: socket.user.name,
              avatar: socket.user.avatar
            },
            timestamp: new Date()
          });

          console.log(`Task ${taskId} updated by ${socket.user.name} in project ${projectId}`);
        }
      } catch (error) {
        console.error('Task update error:', error);
        socket.emit('error', { message: 'Failed to update task' });
      }
    });

    // Handle new comments
    socket.on('comment-added', async (data) => {
      try {
        const { commentId, taskId, projectId, comment } = data;

        // Verify user has permission to comment in this project
        const membership = await ProjectMember.findOne({
          project: projectId,
          user: socket.userId,
          status: 'active'
        });

        if (membership && membership.permissions.canComment) {
          // Broadcast new comment to all project members
          socket.to(`project:${projectId}`).emit('comment-added', {
            commentId,
            taskId,
            projectId,
            comment: {
              ...comment,
              author: {
                id: socket.user._id,
                name: socket.user.name,
                avatar: socket.user.avatar
              }
            },
            timestamp: new Date()
          });

          console.log(`Comment added by ${socket.user.name} on task ${taskId}`);
        }
      } catch (error) {
        console.error('Comment add error:', error);
        socket.emit('error', { message: 'Failed to add comment' });
      }
    });

    // Handle project updates
    socket.on('project-updated', async (data) => {
      try {
        const { projectId, updates, action } = data;

        // Verify user has permission to update project
        const membership = await ProjectMember.findOne({
          project: projectId,
          user: socket.userId,
          status: 'active'
        });

        if (membership && membership.permissions.canEditProject) {
          // Broadcast project update to all project members
          socket.to(`project:${projectId}`).emit('project-updated', {
            projectId,
            updates,
            action, // 'updated', 'status-changed', 'member-added', 'member-removed'
            updatedBy: {
              id: socket.user._id,
              name: socket.user.name,
              avatar: socket.user.avatar
            },
            timestamp: new Date()
          });

          console.log(`Project ${projectId} updated by ${socket.user.name}`);
        }
      } catch (error) {
        console.error('Project update error:', error);
        socket.emit('error', { message: 'Failed to update project' });
      }
    });

    // Handle member added to project
    socket.on('member-added', async (data) => {
      try {
        const { projectId, newMember } = data;

        // Verify user has permission to manage members
        const membership = await ProjectMember.findOne({
          project: projectId,
          user: socket.userId,
          status: 'active'
        });

        if (membership && membership.permissions.canManageMembers) {
          // Notify all project members
          socket.to(`project:${projectId}`).emit('member-added', {
            projectId,
            newMember,
            addedBy: {
              id: socket.user._id,
              name: socket.user.name,
              avatar: socket.user.avatar
            },
            timestamp: new Date()
          });

          // Notify the new member directly if they're online
          const userId = newMember.user?.id || newMember.user?._id || newMember.userId;
          const userName = newMember.user?.name || newMember.userName || 'Unknown User';
          
          if (userId) {
            socket.to(`user:${userId}`).emit('project-invitation', {
              projectId,
              project: data.project,
              invitedBy: {
                id: socket.user._id,
                name: socket.user.name,
                avatar: socket.user.avatar
              },
              role: newMember.role,
              timestamp: new Date()
            });
          }

          console.log(`Member ${userName} added to project ${projectId} by ${socket.user.name}`);
        }
      } catch (error) {
        console.error('Member add error:', error);
        socket.emit('error', { message: 'Failed to add member' });
      }
    });

    // Handle typing indicators for comments
    socket.on('typing-start', (data) => {
      const { taskId, projectId } = data;
      socket.to(`project:${projectId}`).emit('user-typing', {
        taskId,
        user: {
          id: socket.user._id,
          name: socket.user.name
        },
        isTyping: true
      });
    });

    socket.on('typing-stop', (data) => {
      const { taskId, projectId } = data;
      socket.to(`project:${projectId}`).emit('user-typing', {
        taskId,
        user: {
          id: socket.user._id,
          name: socket.user.name
        },
        isTyping: false
      });
    });

    // Handle user presence updates
    socket.on('update-presence', (data) => {
      const { projectId, status } = data; // status: 'online', 'away', 'busy'
      socket.to(`project:${projectId}`).emit('user-presence-updated', {
        user: {
          id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar
        },
        status,
        timestamp: new Date()
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.name} disconnected: ${socket.id}`);
      
      // Notify all rooms the user was in about their disconnection
      socket.broadcast.emit('user-disconnected', {
        user: {
          id: socket.user._id,
          name: socket.user.name
        },
        timestamp: new Date()
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Helper function to emit to specific project members
  const emitToProject = (projectId, event, data) => {
    io.to(`project:${projectId}`).emit(event, data);
  };

  // Helper function to emit to specific user
  const emitToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  // Export helper functions for use in routes
  io.emitToProject = emitToProject;
  io.emitToUser = emitToUser;

  return io;
};

module.exports = socketHandler;
