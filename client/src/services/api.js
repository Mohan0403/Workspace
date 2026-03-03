import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

if (!import.meta.env.VITE_API_URL) {
  console.warn('VITE_API_URL is not set. Falling back to /api. Set VITE_API_URL in Vercel for production.');
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;