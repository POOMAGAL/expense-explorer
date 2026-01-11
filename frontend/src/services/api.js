// src/services/api.js
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('accessToken', access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: async (email, password) => {
    const response = await api.post('/auth/login/', { email, password });
    const { access, refresh } = response.data;
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    return response;
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.patch('/auth/profile/', data),
  requestPasswordReset: (email) => api.post('/auth/password-reset/', { email }),
  confirmPasswordReset: (token, password) => 
    api.post('/auth/password-reset-confirm/', { token, password, password2: password }),
};

// Statement API
export const statementAPI = {
  list: () => api.get('/statements/'),
  upload: (formData) => {
    return api.post('/statements/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  get: (id) => api.get(`/statements/${id}/`),
  delete: (id) => api.delete(`/statements/${id}/`),
};

// Transaction API
export const transactionAPI = {
  list: (params) => api.get('/transactions/', { params }),
  get: (id) => api.get(`/transactions/${id}/`),
};

// Category API
export const categoryAPI = {
  list: () => api.get('/categories/'),
};

// Dashboard API
export const dashboardAPI = {
  getSummary: (params) => api.get('/dashboard/summary/', { params }),
  getCategoryBreakdown: (params) => api.get('/dashboard/category-breakdown/', { params }),
  getTopCategories: (params) => api.get('/dashboard/top-categories/', { params }),
  getSpendingTrend: (params) => api.get('/dashboard/spending-trend/', { params }),
  getSpendingByWeekday: (params) => api.get('/dashboard/spending-by-weekday/', { params }),
  getRecommendations: () => api.get('/dashboard/recommendations/'),
};

// Utility functions
export const isAuthenticated = () => {
  const token = localStorage.getItem('accessToken');
  if (!token) return false;

  try {
    const decoded = jwtDecode(token);
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export default api;