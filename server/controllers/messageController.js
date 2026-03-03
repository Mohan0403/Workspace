import Message from '../models/Message.js';
import Activity from '../models/Activity.js';

const hasWorkspaceMembership = (user, workspaceId) => {
  return user.workspaces.some((membership) => membership.workspace.toString() === workspaceId.toString());
};

// @desc    Get messages for a workspace/channel
// @route   GET /api/messages?workspace=:workspaceId&channel=:channel
export const getMessages = async (req, res) => {
  try {
    const workspace = req.params.workspaceId || req.query.workspace;
    const { channel } = req.query;

    if (!workspace) {
      return res.status(400).json({ message: 'workspace query is required' });
    }

    if (!hasWorkspaceMembership(req.user, workspace)) {
      return res.status(403).json({ message: 'Not authorized for this workspace' });
    }

    const messages = await Message.find({ workspace, channel: channel || 'general' })
      .populate('sender', 'name email avatar status')
      .sort('createdAt')
      .limit(100);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const sendMessage = async (req, res) => {
  try {
    const { workspace, channel, content, attachments } = req.body;

    if (!workspace) {
      return res.status(400).json({ message: 'workspace is required' });
    }

    if (!hasWorkspaceMembership(req.user, workspace)) {
      return res.status(403).json({ message: 'Not authorized for this workspace' });
    }

    const message = await Message.create({
      workspace,
      channel: channel || 'general',
      sender: req.user._id,
      content,
      attachments: attachments || [],
      readBy: [{ user: req.user._id }]
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email avatar status');

    req.app.get('io').to(`workspace_${workspace}`).emit('new-message', populatedMessage);

    await Activity.create({
      workspace,
      user: req.user._id,
      action: 'sent message',
      target: (content || '').slice(0, 80),
      module: 'chat',
      metadata: { channel: channel || 'general', messageId: message._id }
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { workspace, channel = 'general', messageIds = [] } = req.body;

    if (!workspace) {
      return res.status(400).json({ message: 'workspace is required' });
    }

    if (!hasWorkspaceMembership(req.user, workspace)) {
      return res.status(403).json({ message: 'Not authorized for this workspace' });
    }

    const filter = {
      workspace,
      channel,
      'readBy.user': { $ne: req.user._id }
    };

    if (Array.isArray(messageIds) && messageIds.length > 0) {
      filter._id = { $in: messageIds };
    }

    const updateResult = await Message.updateMany(filter, {
      $push: {
        readBy: {
          user: req.user._id,
          readAt: new Date()
        }
      }
    });

    req.app.get('io').to(`workspace_${workspace}`).emit('messages-read', {
      workspace,
      channel,
      userId: req.user._id,
      messageIds,
      modifiedCount: updateResult.modifiedCount || 0
    });

    res.json({
      message: 'Messages marked as read',
      modifiedCount: updateResult.modifiedCount || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};