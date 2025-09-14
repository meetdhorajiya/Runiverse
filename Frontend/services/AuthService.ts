import { User } from '../lib/models/User';
import { api } from './api';

// This service class encapsulates all authentication-related logic.
// Instead of having API calls scattered in the UI, we centralize them here.
// This is an example of the Single Responsibility Principle.
class AuthService {
  // A singleton instance to ensure we only have one AuthService
  private static instance: AuthService;
  private token: string | null = null;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  getToken() { return this.token; }
  setToken(t: string | null) { this.token = t; }

  async login(email: string, password: string): Promise<{ success: boolean; message: string; user?: any; token?: string }> {
    try {
      const resp = await api.post<{ msg: string; token: string; user: any }>(`/api/auth/login`, { email, password });
      this.token = resp.token;
      return { success: true, message: resp.msg, user: resp.user, token: resp.token };
    } catch (e: any) {
      return { success: false, message: e.message || 'Login failed' };
    }
  }

  async register(userData: User & { password?: string }): Promise<{ success: boolean; message: string; user?: any; token?: string }> {
    try {
      // For now generate a temporary password if not supplied (backend requires one)
      const password = userData['password'] || 'Password123!';
      const body = { username: userData.username, email: userData.email, password };
      const resp = await api.post<{ msg: string; token: string; user: any }>(`/api/auth/register`, body);
      this.token = resp.token;
      return { success: true, message: resp.msg, user: resp.user, token: resp.token };
    } catch (e: any) {
      return { success: false, message: e.message || 'Registration failed' };
    }
  }

  async socialLogin(provider: 'google'): Promise<{ success: boolean; message?: string }> {
    // Placeholder – would open WebBrowser to backend /api/auth/google for OAuth
    return { success: false, message: 'Not implemented yet' };
  }
}

// Export the singleton instance for use across the app
export const authService = AuthService.getInstance();