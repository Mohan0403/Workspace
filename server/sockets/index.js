import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Activity from '../models/Activity.js';

const isWorkspaceMember = (user, workspaceId) => {
  return user.workspaces.some((membership) => membership.workspace.toString() === workspaceId.toString());
};

export default function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) throw new Error('Authentication error');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) throw new Error('User not found');
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User ${socket.user.email} connected`);

    // Update user status
    await User.findByIdAndUpdate(socket.user._id, { status: 'online', lastSeen: new Date() });

    // Join all user's workspaces
    socket.user.workspaces.forEach(w => {
      socket.join(`workspace_${w.workspace.toString()}`);
    });

    // Broadcast online status to workspaces
    socket.user.workspaces.forEach(w => {
      socket.to(`workspace_${w.workspace.toString()}`).emit('user-status', {
        userId: socket.user._id,
        status: 'online'
      });
    });

    // Handle joining a specific workspace (if not already joined)
    socket.on('join-workspace', (workspaceId) => {
      if (!isWorkspaceMember(socket.user, workspaceId)) return;
      socket.join(`workspace_${workspaceId}`);
    });

    socket.on('leave-workspace', (workspaceId) => {
      if (!isWorkspaceMember(socket.user, workspaceId)) return;
      socket.leave(`workspace_${workspaceId}`);
    });

    // Chat message
    socket.on('send-message', async (data) => {
      try {
        const { workspaceId, channel, content, attachments } = data;
        if (!workspaceId || !content?.trim()) return;
        if (!isWorkspaceMember(socket.user, workspaceId)) return;

        const message = await Message.create({
          workspace: workspaceId,
          channel: channel || 'general',
          sender: socket.user._id,
          content,
          attachments: attachments || [],
          readBy: [{ user: socket.user._id }]
        });

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'name email avatar status');

        io.to(`workspace_${workspaceId}`).emit('new-message', populatedMessage);

        await Activity.create({
          workspace: workspaceId,
          user: socket.user._id,
          action: 'sent message',
          target: (content || '').slice(0, 80),
          module: 'chat',
          metadata: { channel: channel || 'general', messageId: message._id }
        });
      } catch (err) {
        console.error('Socket message error:', err);
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const { workspaceId, channel, isTyping } = data;
      if (!workspaceId || !isWorkspaceMember(socket.user, workspaceId)) return;

      socket.to(`workspace_${workspaceId}`).emit('typing-indicator', {
        user: socket.user.name,
        userId: socket.user._id,
        channel,
        isTyping
      });
    });

    // Task updates
    socket.on('task-updated', (data) => {
      const { workspaceId, task } = data;
      if (!workspaceId || !isWorkspaceMember(socket.user, workspaceId)) return;
      socket.to(`workspace_${workspaceId}`).emit('task-changed', task);
    });

    socket.on('mark-read', async (data) => {
      try {
        const { workspaceId, channel = 'general', messageIds = [] } = data || {};
        if (!workspaceId || !isWorkspaceMember(socket.user, workspaceId)) return;

        const filter = {
          workspace: workspaceId,
          channel,
          'readBy.user': { $ne: socket.user._id }
        };

        if (Array.isArray(messageIds) && messageIds.length > 0) {
          filter._id = { $in: messageIds };
        }

        await Message.updateMany(filter, {
          $push: {
            readBy: {
              user: socket.user._id,
              readAt: new Date()
            }
          }
        });

        io.to(`workspace_${workspaceId}`).emit('messages-read', {
          workspace: workspaceId,
          channel,
          userId: socket.user._id,
          messageIds
        });
      } catch (err) {
        console.error('Socket read receipt error:', err);
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`User ${socket.user.email} disconnected`);
      await User.findByIdAndUpdate(socket.user._id, { status: 'offline', lastSeen: new Date() });

      // Broadcast offline status
      socket.user.workspaces.forEach(w => {
        socket.to(`workspace_${w.workspace.toString()}`).emit('user-status', {
          userId: socket.user._id,
          status: 'offline'
        });
      });
    });
  });

  return io;
}