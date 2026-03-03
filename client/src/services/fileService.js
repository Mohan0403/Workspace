import api from './api';

export const getFiles = (workspaceId, folder = '') => api.get(`/files/${workspaceId}?folder=${folder}`);
export const uploadFile = (formData) => api.post('/files/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteFile = (fileId) => api.delete(`/files/${fileId}`);