import api from './api';

export const getWorkspaces = () => api.get('/workspaces');
export const getWorkspace = (id) => api.get(`/workspaces/${id}`);
export const createWorkspace = (data) => api.post('/workspaces', data);
export const updateWorkspace = (id, data) => api.put(`/workspaces/${id}`, data);
export const deleteWorkspace = (id) => api.delete(`/workspaces/${id}`);
export const inviteMember = (workspaceId, data) => api.post(`/workspaces/${workspaceId}/invite`, data);
export const updateMemberRole = (workspaceId, userId, role) => api.put(`/workspaces/${workspaceId}/members/${userId}`, { role });
export const removeMember = (workspaceId, userId) => api.delete(`/workspaces/${workspaceId}/members/${userId}`);