import api from './api';

export const getModules = (workspaceId) => api.get(`/workspaces/${workspaceId}/modules`);
export const addModule = (workspaceId, data) => api.post(`/workspaces/${workspaceId}/modules`, data);
export const updateModule = (workspaceId, moduleId, data) => api.put(`/workspaces/${workspaceId}/modules/${moduleId}`, data);
export const reorderModules = (workspaceId, moduleIds) => api.put(`/workspaces/${workspaceId}/modules/reorder`, { moduleIds });
export const removeModule = (workspaceId, moduleId) => api.delete(`/workspaces/${workspaceId}/modules/${moduleId}`);