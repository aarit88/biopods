import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const DATASET_API_URL = API_URL.replace('/v1', '/dataset');
const datasetApi = axios.create({
  baseURL: DATASET_API_URL,
});

const injectToken = (config: any) => {
  const token = localStorage.getItem('biopods_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

// Add a request interceptor to include the JWT token
api.interceptors.request.use(injectToken);
datasetApi.interceptors.request.use(injectToken);

export const apiService = {
  auth: {
    login: (credentials: any) => api.post('/auth/login', credentials),
  },
  clusters: {
    list: () => api.get('/clusters'),
  },
  nodes: {
    list: () => api.get('/nodes'),
    reboot: (id: string) => api.post(`/nodes/${id}/reboot`),
    mitigate: (id: string) => api.post(`/nodes/${id}/mitigate`),
  },
  agents: {
    list: () => api.get('/agents'),
    control: (id: string, action: string) => api.post(`/agents/${id}/control`, { action }),
  },
  telemetry: {
    getRecentAnomalies: () => api.get('/anomalies'),
    getHistory: (limit?: number) => api.get('/telemetry/history', { params: { limit } }),
  },
  pods: {
    list: () => api.get('/pods'),
  },
  actions: {
    execute: (podId: string, actionType: string, eventId?: string) =>
      api.post('/actions/execute', { podId, actionType, eventId }),
  },
  antibody: {
    deploy: () => api.post('/antibody/deploy'),
  },
  clusterVitals: {
    get: () => api.get('/cluster/vitals'),
  },
  memoryCells: {
    list: () => api.get('/memory-cells'),
  },
  auditLogs: {
    list: (limit?: number) => api.get('/audit-logs', { params: { limit } }),
  },
  immuneResponses: {
    list: (limit?: number) => api.get('/immune-responses', { params: { limit } }),
  },
  selfHeal: {
    getStats: () => api.get('/self-heal/stats'),
  },
  settings: {
    get: () => api.get('/settings'),
    save: (settings: any) => api.post('/settings', settings),
  },
  dataset: {
    listImports: () => datasetApi.get('/imports'),
    getHistory: (params?: any) => datasetApi.get('/history', { params }),
    getAnomalies: (params?: any) => datasetApi.get('/anomalies', { params }),
    getTrends: (params?: any) => datasetApi.get('/trends', { params }),
    upload: (formData: FormData) => datasetApi.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  },
};

export default api;
