// src/api/client.ts
import axios, { AxiosInstance } from 'axios';
import { User, Solve, LiveStats, DashboardSummary, Scramble, PaginatedSolves } from '@/types/api';

type ScoreSolveResponse = {
  mlScore: number;
  scoreVersion: string;
  expectedTimeMs: number | null;
  dnfRisk: number;
  plus2Risk: number;
};

export type BasicUser = {
  id: number;
  name: string | null;
  email: string | null;
};

export type IncomingFriendRequest = {
  id: number;
  status: string;
  createdAt: string | null;
  respondedAt: string | null;
  fromUser: BasicUser;
};

export type OutgoingFriendRequest = {
  id: number;
  status: string;
  createdAt: string | null;
  respondedAt: string | null;
  toUser: BasicUser;
};

export type FriendRow = BasicUser;

export type FriendStats = {
  count: number | null;
  bestMs: number | null;
  worstMs: number | null;
  ao5Ms: number | null;
  ao12Ms: number | null;
  avgMs: number | null;
  avgScore: number | null;
};

export type FriendSolveMin = {
  id: number;
  timeMs: number | null;
  penalty: string | null;
  effectiveTimeMs: number | null;
  mlScore: number | null;
  createdAt: string | null;
};

export type FriendSummaryResponse = {
  user: BasicUser;
  stats: FriendStats;
  recentSolves: FriendSolveMin[];
};

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
    });

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('rubiks_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('rubiks_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async signup(email: string, password: string, name: string): Promise<{ user: User }> {
    const response = await this.client.post('/auth/signup', { email, password, name });
    return response.data;
  }

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async getCurrentUser(): Promise<{ user: User }> {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // Scramble endpoint (NOW RETURNS state)
  async getScramble(event: string = '3x3'): Promise<Scramble> {
    const response = await this.client.get('/scramble', { params: { event } });
    return response.data;
  }

  // Solves endpoints
  async createSolve(data: {
    scramble: string;
    timeMs: number;
    penalty?: string | null;
    source?: string;
    notes?: string;
    event?: string;
    state?: string;
    solutionMoves?: string[];
    numMoves?: number;
    tags?: string[];
  }): Promise<{ solve: Solve; liveStats: LiveStats }> {
    const response = await this.client.post('/solves', data);
    return response.data;
  }

  async getLiveStats(event: string = '3x3'): Promise<LiveStats> {
    const response = await this.client.get('/solves/live-stats', { params: { event } });
    return response.data;
  }

  async getSolves(params?: {
    limit?: number;
    cursor?: string;
    event?: string;
    penalty?: string;
    source?: string;
    hasScore?: boolean;
    hasSolution?: boolean;
    from?: string;
    to?: string;
  }): Promise<PaginatedSolves> {
    const response = await this.client.get('/solves', { params });
    return response.data;
  }

  async getSolve(id: number): Promise<{ solve: Solve }> {
    const response = await this.client.get(`/solves/${id}`);
    return response.data;
  }

  async updateSolve(
    id: number,
    data: {
      penalty?: string | null;
      notes?: string;
    }
  ): Promise<{ solve: Solve }> {
    const response = await this.client.patch(`/solves/${id}`, data);
    return response.data;
  }

  async deleteSolve(id: number): Promise<{ success: boolean }> {
    const response = await this.client.delete(`/solves/${id}`);
    return response.data;
  }

  async scoreSolve(id: number): Promise<ScoreSolveResponse> {
    // send {} explicitly (some servers expect a JSON body)
    const response = await this.client.post(`/solves/${id}/score`, {});
    return response.data;
  }

  // Compute optimal solution WITHOUT saving
  async getOptimalSolution(data: {
    state: string;   // 54 chars, URFDLB
    event?: string;  // "3x3"
  }): Promise<{ solutionMoves: string[]; numMoves: number }> {
    const response = await this.client.post('/solves/optimal', data);
    return response.data;
  }

  // Dashboard endpoint
  async getDashboardSummary(range: string = '30d'): Promise<DashboardSummary> {
    const response = await this.client.get('/dashboard/summary', { params: { range } });
    return response.data;
  }

  // Onboarding endpoints
  async setSelfReportedAverage(avgSeconds: number): Promise<{
    skillSource: string;
    selfReported333AvgMs: number;
    skillPriorMs: number;
  }> {
    const response = await this.client.post('/auth/me/skill/self-reported', { avgSeconds });
    return response.data;
  }

  async linkWca(wcaId: string): Promise<{
    wcaId: string;
    wca333AvgMs: number | null;
    wca333SingleMs: number | null;
    skillSource: string;
    skillPriorMs: number | null;
  }> {
    const response = await this.client.post('/auth/me/skill/wca', { wcaId });
    return response.data;
  }
async sendFriendRequest(email: string): Promise<any> {
    const response = await this.client.post('/friends/requests', { email });
    return response.data;
  }

  async getIncomingFriendRequests(): Promise<{ items: any[] }> {
    const response = await this.client.get('/friends/requests/incoming');
    return response.data;
  }

  async getOutgoingFriendRequests(): Promise<{ items: any[] }> {
    const response = await this.client.get('/friends/requests/outgoing');
    return response.data;
  }

  async acceptFriendRequest(requestId: number): Promise<{ success: boolean }> {
    const response = await this.client.post(`/friends/requests/${requestId}/accept`, {});
    return response.data;
  }

  async declineFriendRequest(requestId: number): Promise<{ success: boolean }> {
    const response = await this.client.post(`/friends/requests/${requestId}/decline`, {});
    return response.data;
  }

  async cancelFriendRequest(requestId: number): Promise<{ success: boolean }> {
    const response = await this.client.delete(`/friends/requests/${requestId}`);
    return response.data;
  }

  async getFriends(): Promise<{ items: any[] }> {
    const response = await this.client.get('/friends');
    return response.data;
  }

  async getFriendSummary(friendId: number): Promise<any> {
    const response = await this.client.get(`/friends/${friendId}/summary`);
    return response.data;
  }

}

export const apiClient = new APIClient();
