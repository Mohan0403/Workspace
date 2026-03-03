import Activity from '../models/Activity.js';

export const getActivities = async (req, res) => {
  try {
    const workspace = req.params.workspaceId || req.query.workspace;

    if (!workspace) {
      return res.status(400).json({ message: 'workspace query is required' });
    }

    const isMember = req.user.workspaces.some(
      (membership) => membership.workspace.toString() === workspace.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized for this workspace' });
    }

    const activities = await Activity.find({ workspace })
      .populate('user', 'name email avatar')
      .sort('-createdAt')
      .limit(50);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};