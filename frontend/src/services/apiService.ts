// API Service for SecureMsg with versioned endpoints

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';
const API_VERSION = 'v1';

class APIService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/${API_VERSION}`;
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const config: RequestInit = {
      ...options,
      headers: defaultHeaders,
    };

    try {
      const response = await fetch(url, config);
      return response;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw new Error(`Network error: ${error}`);
    }
  }

  // Authentication endpoints
  async register(userData: {
    username: string;
    email: string;
    fullName: string;
    company: string;
    password: string;
    turnstileToken?: string;
  }) {
    const response = await this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    return response.json();
  }

  async login(credentials: {
    username: string;
    password: string;
    turnstileToken?: string;
  }) {
    const response = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    return response.json();
  }

  async logout() {
    const response = await this.makeRequest('/auth/logout', {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Logout failed');
    }

    return response.json();
  }

  // User management endpoints
  async getUser(username: string) {
    const response = await this.makeRequest(`/users/${username}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'User lookup failed');
    }

    return response.json();
  }

  async getAllUsers() {
    const response = await this.makeRequest('/users');

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch users');
    }

    return response.json();
  }

  // Connection management
  async getConnections() {
    const response = await this.makeRequest('/connections');

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch connections');
    }

    return response.json();
  }

  // WebSocket connection
  createWebSocketConnection(): WebSocket {
    const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/api/${API_VERSION}/ws`;
    return new WebSocket(wsUrl);
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiService = new APIService();

// Export types for TypeScript
export interface User {
  username: string;
  fullName: string;
  status: 'online' | 'offline';
  lastSeen: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
}

export interface ConnectionInfo {
  activeConnections: Array<{
    connectionId: string;
    username: string;
    connected: boolean;
  }>;
  totalConnections: number;
}

export interface APIError {
  error: string;
  message?: string;
  timestamp?: string;
}