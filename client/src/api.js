import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL + '/api'
  : '/api';

console.log('API Base URL:', BASE);

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('aq_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const login = (email, password) => api.post('/auth/login', { email, password });
export const signup = (name, email, password, role) => api.post('/auth/signup', { name, email, password, role });
export const getGoals = () => api.get('/goals');
export const createGoal = d => api.post('/goals', d);
export const updateGoal = (id, d) => api.put(`/goals/${id}`, d);
export const deleteGoal = id => api.delete(`/goals/${id}`);
export const submitGoals = () => api.post('/goals/submit');
export const approveGoal = id => api.post(`/goals/${id}/approve`);
export const returnGoal = id => api.post(`/goals/${id}/return`);
export const getAchievements = (employee_id, quarter) => api.get('/achievements', { params: { employee_id, quarter } });
export const saveAchievement = d => api.post('/achievements', d);
export const saveCheckin = d => api.post('/checkins', d);
export const getCheckins = goalId => api.get(`/checkins/${goalId}`);
export const getTeam = () => api.get('/users/team');
export const getAllUsers = () => api.get('/users/all');
export const getReport = () => api.get('/reports/achievement');
export const getCompletion = () => api.get('/reports/completion');
export const getAudit = () => api.get('/audit');
export const createSharedGoal = d => api.post('/goals/shared', d);
export const getNotifications = () => api.get('/notifications');
export const getNotifCount = () => api.get('/notifications/count');
export const markRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllRead = () => api.put('/notifications/read-all');
export const getEscalations = () => api.get('/escalations');

export default api;
