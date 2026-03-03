import api from './api';

export const register = (userData) => api.post('/auth/register', userData);
export const login = (userData) => api.post('/auth/login', userData);
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');