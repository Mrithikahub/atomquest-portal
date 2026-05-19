import axios from 'axios';

const apiBaseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : '');

if (!apiBaseURL && import.meta.env.PROD) {
  console.error('VITE_API_URL is not configured. Production API requests will fail until it points to the Render backend.');
}

const api = axios.create({
  baseURL: apiBaseURL ? apiBaseURL.replace(/\/$/, '') : undefined
});

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
export const getReport = (params) => api.get('/reports/achievement', { params });
export const getCompletion = () => api.get('/reports/completion');
export const getAudit = () => api.get('/audit');
export const createSharedGoal = d => api.post('/goals/shared', d);
export const getEscalations = () => api.get('/escalations');
export const getNotifications = () => api.get('/notifications');
export const getNotificationCount = () => api.get('/notifications/count');
export const markNotificationRead = id => api.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/notifications/read-all');
export const getAdminEmployees = () => api.get('/admin/employees');
export const getAdminManagers = () => api.get('/admin/managers');
export const assignManager = (employeeId, managerId) => api.put('/admin/assign-manager', { employeeId, managerId });

export default api;
