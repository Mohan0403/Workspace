export const requireWorkspaceRole = (allowedRoles) => {
  return (req, res, next) => {
    const workspaceId = req.params.workspaceId || req.body.workspace;
    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID missing' });
    }

    const membership = req.user.workspaces.find(w => w.workspace.toString() === workspaceId);
    if (!membership) {
      return res.status(403).json({ message: 'You are not a member of this workspace' });
    }

    if (!allowedRoles.includes(membership.role)) {
      return res.status(403).json({ message: `Required role: ${allowedRoles.join(' or ')}` });
    }

    req.membership = membership;
    next();
  };
};

export const isOwnerOrAdmin = requireWorkspaceRole(['owner', 'admin']);
export const isOwner = requireWorkspaceRole(['owner']);
export const isAtLeastMember = requireWorkspaceRole(['owner', 'admin', 'member']);