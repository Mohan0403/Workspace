import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { getSocket } from '../../services/socketService';
import * as activityService from '../../services/activityService';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const { currentWorkspace } = useSelector((state) => state.workspace);

  useEffect(() => {
    const loadRecentNotifications = async () => {
      if (!currentWorkspace?._id) {
        setNotifications([]);
        return;
      }

      try {
        const { data } = await activityService.getActivities(currentWorkspace._id);
        const normalized = (data || []).slice(0, 10).map((activity) => ({
          _id: activity._id,
          message: `${activity.user?.name || 'User'} ${activity.action} ${activity.target || ''}`.trim(),
          createdAt: activity.createdAt,
          read: true,
        }));
        setNotifications(normalized);
      } catch (_error) {
        setNotifications([]);
      }
    };

    loadRecentNotifications();
  }, [currentWorkspace?._id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const handleNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 10));
    };

    const handleNewMessage = (message) => {
      const messageWorkspaceId = message.workspace?._id || message.workspace;
      if (currentWorkspace?._id && messageWorkspaceId?.toString() !== currentWorkspace._id.toString()) return;

      setNotifications((prev) => [
        {
          _id: `msg-${message._id}`,
          message: `${message.sender?.name || 'Someone'} sent a message`,
          createdAt: message.createdAt || new Date().toISOString(),
          read: false,
        },
        ...prev,
      ].slice(0, 10));
    };

    const handleTaskChanged = (task) => {
      const taskWorkspaceId = task.workspace?._id || task.workspace;
      if (currentWorkspace?._id && taskWorkspaceId?.toString() !== currentWorkspace._id.toString()) return;

      const label = task.deleted ? 'Task deleted' : 'Task updated';
      setNotifications((prev) => [
        {
          _id: `task-${task._id}-${Date.now()}`,
          message: `${label}: ${task.title || ''}`.trim(),
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...prev,
      ].slice(0, 10));
    };

    socket.on('notification', handleNotification);
    socket.on('new-message', handleNewMessage);
    socket.on('task-changed', handleTaskChanged);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('new-message', handleNewMessage);
      socket.off('task-changed', handleTaskChanged);
    };
  }, [currentWorkspace?._id]);

  useEffect(() => {
    if (showDropdown) {
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    }
  }, [showDropdown]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="p-2 rounded-lg hover:bg-white/10 relative"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        )}
      </button>
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-80 glass-panel border border-white/10 rounded-lg shadow-xl z-50"
          >
            <div className="p-3 border-b border-white/10">
              <h4 className="font-semibold">Notifications</h4>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-400">No notifications</div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif._id} className="p-3 hover:bg-white/5 border-b border-white/10 last:border-0">
                    <p className="text-sm">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notif.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;