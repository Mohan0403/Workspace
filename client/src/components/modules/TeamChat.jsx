import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Send } from 'lucide-react';
import { getSocket } from '../../services/socketService';
import * as messageService from '../../services/messageService';

const TeamChat = ({ module }) => {
  const { workspaceId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [error, setError] = useState('');
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    loadMessages();
    const socket = getSocket();
    if (!socket) return undefined;

    socket.emit('join-workspace', workspaceId);

    socket.on('new-message', (message) => {
      const messageWorkspaceId = message.workspace?._id || message.workspace;
      if (messageWorkspaceId?.toString() === workspaceId.toString()) {
        setMessages(prev => [...prev, message]);
      }
    });
    socket.on('typing-indicator', ({ userId, isTyping, user: userName }) => {
      if (userId !== user?._id) {
        setTypingUsers(prev => {
          if (isTyping) {
            return [...new Set([...prev, userName])];
          } else {
            return prev.filter(name => name !== userName);
          }
        });
      }
    });

    socket.on('messages-read', ({ workspace, userId, messageIds }) => {
      if (workspace?.toString() !== workspaceId.toString()) return;
      setMessages((prev) => prev.map((message) => {
        if (!Array.isArray(messageIds) || messageIds.length === 0 || !messageIds.includes(message._id)) {
          return message;
        }

        const alreadyRead = (message.readBy || []).some((entry) => {
          const readerId = entry.user?._id || entry.user;
          return readerId?.toString() === userId?.toString();
        });

        if (alreadyRead) return message;

        return {
          ...message,
          readBy: [...(message.readBy || []), { user: userId, readAt: new Date().toISOString() }]
        };
      }));
    });

    return () => {
      socket.emit('leave-workspace', workspaceId);
      socket.off('new-message');
      socket.off('typing-indicator');
      socket.off('messages-read');
    };
  }, [workspaceId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setError('');
      const { data } = await messageService.getMessages(workspaceId);
      setMessages(data);
      if (data.length > 0) {
        const unreadMessageIds = data
          .filter((message) => {
            const alreadyRead = (message.readBy || []).some((entry) => {
              const readerId = entry.user?._id || entry.user;
              return readerId?.toString() === user?._id?.toString();
            });
            return !alreadyRead;
          })
          .map((message) => message._id);

        if (unreadMessageIds.length > 0) {
          await messageService.markMessagesAsRead({
            workspace: workspaceId,
            channel: 'general',
            messageIds: unreadMessageIds
          });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load chat messages');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const socket = getSocket();
    if (!socket) {
      setError('Socket not connected');
      return;
    }
    socket.emit('send-message', {
      workspaceId,
      channel: 'general',
      content: newMessage,
    });
    setNewMessage('');
  };

  const handleTyping = (isTyping) => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit('typing', { workspaceId, channel: 'general', isTyping });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { workspaceId, channel: 'general', isTyping: false });
      }, 1200);
    }
  };

  return (
    <div className="glass-panel p-4 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4">Team Chat</h3>
      {error && <div className="mb-3 text-sm text-red-400">{error}</div>}
      <div className="flex-1 overflow-y-auto mb-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg._id} className={`flex ${msg.sender?._id === user?._id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] rounded-lg p-3 ${msg.sender?._id === user?._id ? 'bg-accent' : 'bg-white/10'}`}>
              {msg.sender?._id !== user?._id && (
                <p className="text-xs text-gray-300 mb-1">{msg.sender?.name}</p>
              )}
              <p>{msg.content}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(msg.createdAt).toLocaleTimeString()}</p>
            </div>
          </div>
        ))}
        {typingUsers.length > 0 && (
          <div className="text-sm text-gray-400 italic">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="flex items-center">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={() => handleTyping(true)}
          onBlur={() => handleTyping(false)}
          placeholder="Type a message..."
          className="flex-1 bg-white/5 border border-white/10 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button type="submit" className="bg-accent hover:bg-accent-glow px-4 py-2 rounded-r-lg">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default TeamChat;