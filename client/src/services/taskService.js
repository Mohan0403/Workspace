import api from './api';

export const getTasks = (workspaceId) => api.get(`/tasks/${workspaceId}`);
export const createTask = (data) => api.post('/tasks', data);
export const updateTask = (taskId, data) => api.put(`/tasks/${taskId}`, data);
export const deleteTask = (taskId) => api.delete(`/tasks/${taskId}`);