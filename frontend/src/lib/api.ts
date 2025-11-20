import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rubiks_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('rubiks_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Solve {
  id: string;
  state: string;
  moves: string;
  numMoves: number;
  source: 'manual' | 'scramble';
  createdAt: string;
}

export interface SolveResponse {
  moves: string;
  numMoves: number;
  state: string;
  source: string;
}

export const signup = async (email: string, password: string, name: string): Promise<User> => {
  const response = await api.post('/auth/signup', { email, password, name });
  return response.data;
};

export const login = async (email: string, password: string): Promise<{ token: string; user: User }> => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const solveCube = async (state: string, source: 'manual' | 'scramble'): Promise<SolveResponse> => {
  const response = await api.post('/solve', { state, source });
  return response.data;
};

export const getSolves = async (): Promise<Solve[]> => {
  const response = await api.get('/solves');
  return response.data;
};

export default api;
