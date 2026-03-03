import api from './api';

export const getMessages = (workspaceId, channel = 'general') => api.get(`/messages/${workspaceId}?channel=${channel}`);
export const sendMessage = (data) => api.post('/messages', data);
export const markMessagesAsRead = (data) => api.post('/messages/read', data);