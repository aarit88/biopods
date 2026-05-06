import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('biopods_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiService = {
  auth: {
    login: (credentials: any) => api.post('/auth/login', credentials),
  },
  clusters: {
    list: () => api.get('/clusters'),
  },
  agents: {
    list: () => api.get('/agents'),
    control: (id: string, action: string) => api.post(`/agents/${id}/control`, { action }),
  },
  telemetry: {
    getRecentAnomalies: () => api.get('/anomalies'),
  },
  actions: {
    execute: (podId: string, actionType: string) => api.post('/actions/execute', { podId, actionType }),
  },
};

export default api;
