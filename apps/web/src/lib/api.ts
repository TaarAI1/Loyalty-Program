import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.message ?? err.response?.data?.error ?? err.message ?? 'Request failed';
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('loyalty_token');
      localStorage.removeItem('loyalty_user');
      window.location.href = '/login';
    }
    return Promise.reject(new Error(Array.isArray(message) ? message.join(', ') : message));
  },
);

// Dashboard
export const dashboardApi = {
  getMetrics: () => api.get('/dashboard/metrics').then((r) => r.data),
  getPointsTrend: (days = 30) => api.get(`/dashboard/points-trend?days=${days}`).then((r) => r.data),
  getTierDistribution: () => api.get('/dashboard/tier-distribution').then((r) => r.data),
  getRecentTransactions: (limit = 10) =>
    api.get(`/dashboard/recent-transactions?limit=${limit}`).then((r) => r.data),
  getCustomerSegments: () => api.get('/dashboard/customer-segments').then((r) => r.data),
  getTopCustomers: (limit = 10) =>
    api.get(`/dashboard/top-customers?limit=${limit}`).then((r) => r.data),
};

// Customers
export const customersApi = {
  getAll: (params: Record<string, unknown>) =>
    api.get('/customers', { params }).then((r) => r.data),
  getOne: (id: string) => api.get(`/customers/${id}`).then((r) => r.data),
  getHistory: (id: string, params: Record<string, unknown>) =>
    api.get(`/customers/${id}/history`, { params }).then((r) => r.data),
  getLedger: (id: string, params: Record<string, unknown>) =>
    api.get(`/customers/${id}/points-ledger`, { params }).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/customers/${id}`, data).then((r) => r.data),
  sendNotification: (id: string, data: { template_name: string; message?: string }) =>
    api.post(`/customers/${id}/notify`, data).then((r) => r.data),
  awardPoints: (id: string, data: { points: number; reason: string }) =>
    api.post(`/customers/${id}/award-points`, data).then((r) => r.data),
};

// Configuration
export const configApi = {
  getTiers: () => api.get('/configuration/loyalty-tiers').then((r) => r.data),
  upsertTier: (data: Record<string, unknown>) =>
    api.put('/configuration/loyalty-tiers', data).then((r) => r.data),
  deleteTier: (id: number) => api.delete(`/configuration/loyalty-tiers/${id}`).then((r) => r.data),
  getWhatsApp: () => api.get('/configuration/whatsapp').then((r) => r.data),
  updateWhatsApp: (data: Record<string, unknown>) =>
    api.put('/configuration/whatsapp', data).then((r) => r.data),
  testWhatsApp: (data: { to: string; template_name: string }) =>
    api.post('/configuration/whatsapp/test', data).then((r) => r.data),
  getSms: () => api.get('/configuration/sms').then((r) => r.data),
  updateSms: (data: Record<string, unknown>) =>
    api.put('/configuration/sms', data).then((r) => r.data),
  getEmail: () => api.get('/configuration/email').then((r) => r.data),
  updateEmail: (data: Record<string, unknown>) =>
    api.put('/configuration/email', data).then((r) => r.data),
};

// Reports
export const reportsApi = {
  getFilters: () => api.get('/reports/filters').then((r) => r.data),
  customerTierWise: (params: Record<string, unknown>) =>
    api.get('/reports/customer-tier', { params }).then((r) => r.data),
  birthdayResponse: (params: Record<string, unknown>) =>
    api.get('/reports/birthday-response', { params }).then((r) => r.data),
  topCustomers: (params: Record<string, unknown>) =>
    api.get('/reports/top-customers', { params }).then((r) => r.data),
  loyaltySalesDetail: (params: Record<string, unknown>) =>
    api.get('/reports/loyalty-sales', { params }).then((r) => r.data),
  forensicReport: (params: Record<string, unknown>) =>
    api.get('/reports/forensic', { params }).then((r) => r.data),
};

// Notifications
export const notificationsApi = {
  getAll: (params: Record<string, unknown>) =>
    api.get('/notifications', { params }).then((r) => r.data),
  getStats: () => api.get('/notifications/stats').then((r) => r.data),
  resend: (id: string | number) => api.post(`/notifications/${id}/resend`).then((r) => r.data),
};

// Users
export const usersApi = {
  getAll: () => api.get('/users').then((r) => r.data),
  create: (data: { username: string; password: string; role: string }) =>
    api.post('/users', data).then((r) => r.data),
  update: (id: number, data: { password?: string; role?: string; isActive?: boolean }) =>
    api.patch(`/users/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/users/${id}`).then((r) => r.data),
};
