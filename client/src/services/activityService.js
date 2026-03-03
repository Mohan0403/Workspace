import api from './api';

export const getActivities = (workspaceId) => api.get(`/activity/${workspaceId}`);