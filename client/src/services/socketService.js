import io from 'socket.io-client';
import { store } from '../store/store';
import { addMessage, updateTask, removeTask } from '../store/moduleSlice';

let socket = null;

export const connectSocket = (token) => {
  if (socket) return socket;
  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001', {
    auth: { token },
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('new-message', (message) => {
    store.dispatch(addMessage(message));
  });

  socket.on('task-changed', (task) => {
    if (task.deleted) {
      store.dispatch(removeTask(task._id));
    } else {
      store.dispatch(updateTask(task));
    }
  });

  socket.on('typing-indicator', (data) => {
    // update UI typing state (could be handled by local state)
  });

  socket.on('user-status', ({ userId, status }) => {
    // update user status in workspace members list
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;