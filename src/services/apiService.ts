/**
 * Base API Service for Beacon Essential 5.0
 * Handles authentication, error handling, and base configurations
 */

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

class ApiService {
  private baseURL: string;

  constructor() {
    const envBase = (import.meta.env.VITE_API_BASE_URL || '').trim();
    const isLocalEnvBase = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(envBase);
    const isLocalHost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
    
    // Use window.location.origin if no env var or if env points to localhost but we're not on localhost
    this.baseURL = envBase && !(isLocalEnvBase && !isLocalHost) 
      ? envBase 
      : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  }

  private getAuthHeaders(): Record<string, string> {
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    try {
      const url = new URL(endpoint, this.baseURL || '').toString();
      const finalUrl = new URL(url);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            finalUrl.searchParams.append(key, String(value));
          }
        });
      }

      const resolvedUrl = finalUrl.toString();
      console.log(`API GET: ${resolvedUrl}`);

      const response = await fetch(resolvedUrl, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: `${data.message || `HTTP ${response.status}`} (URL: ${resolvedUrl})`,
          data: null
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        data: null
      };
    }
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    try {
      const url = new URL(endpoint, this.baseURL || '').toString();
      console.log(`API POST: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: body ? JSON.stringify(body) : undefined
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: `${data.message || `HTTP ${response.status}`} (URL: ${url})`,
          data: null
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        data: null
      };
    }
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: body ? JSON.stringify(body) : undefined
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}`,
          data: null
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        data: null
      };
    }
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}`,
          data: null
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        data: null
      };
    }
  }
}

export const apiService = new ApiService();