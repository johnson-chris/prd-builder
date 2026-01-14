import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { AuthResponse, LoginCredentials, RegisterData, User, Prd, PrdListResponse, CreatePrdInput, UpdatePrdInput, ExtractedSection, TranscriptSSEEvent } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;
let onAuthFailure: (() => void) | null = null;

export function setAccessToken(token: string | null): void { accessToken = token; }
export function getAccessToken(): string | null { return accessToken; }
export function setAuthFailureHandler(handler: () => void): void { onAuthFailure = handler; }

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    // Don't retry on refresh endpoint itself to avoid infinite loop
    const isRefreshRequest = originalRequest.url?.includes('/auth/refresh');
    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshRequest) {
      originalRequest._retry = true;
      try {
        // Use a single refresh promise to prevent multiple simultaneous refresh requests
        if (!refreshPromise) {
          refreshPromise = api.post<{ accessToken: string }>('/auth/refresh')
            .then((response) => {
              setAccessToken(response.data.accessToken);
              return response.data.accessToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const newToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        setAccessToken(null);
        refreshPromise = null;
        // Notify auth failure handler to trigger logout/redirect
        if (onAuthFailure) onAuthFailure();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: async (data: RegisterData): Promise<void> => { await api.post('/auth/register', data); },
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    setAccessToken(response.data.accessToken);
    return response.data;
  },
  logout: async (): Promise<void> => { await api.post('/auth/logout'); setAccessToken(null); },
  refresh: async (): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/refresh');
    setAccessToken(response.data.accessToken);
    return response.data;
  },
  me: async (): Promise<User> => (await api.get<User>('/auth/me')).data,
};

export const prdApi = {
  list: async (page = 1, limit = 20): Promise<PrdListResponse> => (await api.get<PrdListResponse>('/prds', { params: { page, limit } })).data,
  get: async (id: string): Promise<Prd> => (await api.get<Prd>(`/prds/${id}`)).data,
  create: async (data: CreatePrdInput): Promise<Prd> => (await api.post<Prd>('/prds', data)).data,
  update: async (id: string, data: UpdatePrdInput): Promise<Prd> => (await api.put<Prd>(`/prds/${id}`, data)).data,
  delete: async (id: string): Promise<void> => { await api.delete(`/prds/${id}`); },
  download: async (id: string): Promise<Blob> => (await api.get(`/prds/${id}/download`, { responseType: 'blob' })).data as Blob,
};

export const planningApi = {
  sendMessage: (prdId: string, sectionId: string, message: string, onChunk: (chunk: string) => void, onDone: () => void, onError: (error: Error) => void): (() => void) => {
    const controller = new AbortController();
    const fetchSSE = async (): Promise<void> => {
      try {
        const response = await fetch(`${API_URL}/api/prds/${prdId}/sections/${sectionId}/plan/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ message }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') { onDone(); return; }
              try { const parsed = JSON.parse(data) as { content?: string }; if (parsed.content) onChunk(parsed.content); } catch { }
            }
          }
        }
        onDone();
      } catch (error) { if ((error as Error).name !== 'AbortError') onError(error as Error); }
    };
    fetchSSE();
    return () => controller.abort();
  },
};

export interface TranscriptAnalysisCallbacks {
  onProgress: (stage: string, progress: number) => void;
  onSection: (section: ExtractedSection) => void;
  onComplete: (suggestedTitle: string, analysisNotes: string) => void;
  onError: (error: Error) => void;
}

export const transcriptApi = {
  analyze: (
    transcript: string,
    callbacks: TranscriptAnalysisCallbacks
  ): (() => void) => {
    const controller = new AbortController();
    const fetchSSE = async (): Promise<void> => {
      try {
        const response = await fetch(`${API_URL}/api/transcript/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ transcript }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') return;
              try {
                const parsed = JSON.parse(data) as TranscriptSSEEvent;
                switch (parsed.type) {
                  case 'progress':
                    callbacks.onProgress(parsed.stage, parsed.progress);
                    break;
                  case 'section':
                    callbacks.onSection({
                      sectionId: parsed.sectionId,
                      sectionTitle: parsed.sectionTitle,
                      content: parsed.content,
                      confidence: parsed.confidence,
                      sourceQuotes: parsed.sourceQuotes,
                      included: true,
                    });
                    break;
                  case 'complete':
                    callbacks.onComplete(parsed.suggestedTitle, parsed.analysisNotes);
                    break;
                  case 'error':
                    callbacks.onError(new Error(parsed.message));
                    break;
                }
              } catch { }
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          callbacks.onError(error as Error);
        }
      }
    };
    fetchSSE();
    return () => controller.abort();
  },
};
