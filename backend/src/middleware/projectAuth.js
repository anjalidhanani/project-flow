const ProjectMember = require('../models/ProjectMember');

// Middleware to check if user has specific project permissions
const checkProjectPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.id || req.params.projectId;
      
      if (!projectId) {
        return res.status(400).json({ message: 'Project ID is required' });
      }

      // Check if user has permission for this project
      const membership = await ProjectMember.findOne({
        project: projectId,
        user: req.user._id,
        status: 'active'
      });

      if (!membership) {
        return res.status(403).json({ message: 'Access denied to this project' });
      }

      // Check specific permission
      if (!membership.permissions[permission]) {
        return res.status(403).json({ 
          message: `Permission denied: ${permission} not allowed for your role (${membership.role})` 
        });
      }

      // Attach membership info to request for further use
      req.projectMembership = membership;
      next();
    } catch (error) {
      console.error('Project permission check error:', error);
      res.status(500).json({ message: 'Server error during permission check' });
    }
  };
};

// Middleware to check if user can delete project (owner or admin only)
const canDeleteProject = checkProjectPermission('canDeleteProject');

// Middleware to check if user can manage members (owner or admin only)
const canManageMembers = checkProjectPermission('canManageMembers');

// Middleware to check if user can edit project (owner, admin, or manager)
const canEditProject = checkProjectPermission('canEditProject');

// Middleware to check if user can delete tasks
const canDeleteTasks = checkProjectPermission('canDeleteTasks');

// Middleware to check if user can edit tasks
const canEditTasks = checkProjectPermission('canEditTasks');

// Middleware to check if user can create tasks
const canCreateTasks = checkProjectPermission('canCreateTasks');

// Helper function to get user's role in project
const getUserProjectRole = async (projectId, userId) => {
  try {
    const membership = await ProjectMember.findOne({
      project: projectId,
      user: userId,
      status: 'active'
    });
    
    return membership ? membership.role : null;
  } catch (error) {
    console.error('Error getting user project role:', error);
    return null;
  }
};

// Helper function to check if user has specific permission
const hasProjectPermission = async (projectId, userId, permission) => {
  try {
    const membership = await ProjectMember.findOne({
      project: projectId,
      user: userId,
      status: 'active'
    });
    
    return membership ? membership.permissions[permission] : false;
  } catch (error) {
    console.error('Error checking project permission:', error);
    return false;
  }
};

module.exports = {
  checkProjectPermission,
  canDeleteProject,
  canManageMembers,
  canEditProject,
  canDeleteTasks,
  canEditTasks,
  canCreateTasks,
  getUserProjectRole,
  hasProjectPermission
};
