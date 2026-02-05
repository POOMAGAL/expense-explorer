import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;  // ✅ Return config always
  },
  (error) => Promise.reject(error)
);

// Response interceptor
// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });
        const { access } = response.data;
        localStorage.setItem('access_token', access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (err) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);


export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
};

export const bankAccountAPI = {
  list: () => api.get('/bank-accounts/'),
  create: (data) => api.post('/bank-accounts/', data),
  get: (id) => api.get(`/bank-accounts/${id}/`),
  delete: (id) => api.delete(`/bank-accounts/${id}/`),
};

export const statementAPI = {
  list: (bankId) =>
    api.get('/statements/', { params: { bank_account: bankId } }),

  upload: (data) => {
    const formData = new FormData();
    formData.append('bank_account', data.bank_account);
    formData.append('file', data.file);
    formData.append('file_type', data.file_type);
    if (data.name) {
      formData.append('name', data.name);   // NEW
    }
    return api.post('/statements/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: (id) => api.delete(`/statements/${id}/`),
};


export const analyticsAPI = {
  dashboard: (bankAccountId, statementId = null) =>
    api.get("/api/analytics/dashboard/", {
      params: {
        bank_account: bankAccountId,
        ...(statementId && { statement: statementId }), // matches views.py
      },
    }),
  
  
};


export const transactionAPI = {
  list: (bankAccountId, statementId = null) =>
    api.get("/transactions/", {
      params: {
        bank_account: bankAccountId,
        ...(statementId && { statement: statementId }),
      },
    }),
 // Add to transactionAPI:
  exportDashboard: (bankAccountId, statementId = null) =>
    api.get("/transactions/export_dashboard/", {
      params: { bank_account: bankAccountId, ...(statementId && { statement: statementId }) },
      responseType: 'blob',
    }),

};


export default api;
