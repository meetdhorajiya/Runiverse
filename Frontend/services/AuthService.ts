import api from './api';
import { User } from '../lib/models/User';

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

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  async login(email: string, password: string): Promise<{ success: boolean; message: string; user?: any; token?: string }> {
    try {
      const response = await api.post<any>("/api/auth/login", {
        email,
        password
      });

      if (response.token) {
        this.setToken(response.token);
        return { 
          success: true, 
          message: "Login successful", 
          user: response.user, 
          token: response.token 
        };
      } else {
        return { success: false, message: "Login failed - no token received" };
      }
    } catch (error: any) {
      console.error("Login error:", error);
      return { 
        success: false, 
        message: error.message || "Login failed" 
      };
    }
  }

  async register(userData: User & { password?: string }): Promise<{ success: boolean; message: string; user?: any; token?: string }> {
    try {
      const response = await api.post<any>("/api/auth/register", {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        lastName: userData.lastName,
        mobileNumber: userData.mobileNumber
      });

      if (response.token) {
        this.setToken(response.token);
        return { 
          success: true, 
          message: "Registration successful", 
          user: response.user, 
          token: response.token 
        };
      } else {
        return { success: false, message: "Registration failed - no token received" };
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      return { 
        success: false, 
        message: error.message || "Registration failed" 
      };
    }
  }

  async socialLogin(provider: string): Promise<{ success: boolean; message: string; user?: any; token?: string }> {
    // This would typically open a WebView for OAuth
    // For now, return a placeholder
    return { success: false, message: "Social login not implemented yet" };
  }

  // Directly call backend callback (DEV convenience) - real flow should use browser redirect.
  async googleCallbackDev(): Promise<{ success: boolean; message: string; user?: any; token?: string }> {
    try {
      const response = await api.get<any>("/api/auth/google/callback");
      
      if (response.token) {
        this.setToken(response.token);
        return { 
          success: true, 
          message: "Google login successful", 
          user: response.user, 
          token: response.token 
        };
      } else {
        return { success: false, message: "Google login failed - no token received" };
      }
    } catch (error: any) {
      console.error("Google login error:", error);
      return { 
        success: false, 
        message: error.message || "Google login failed" 
      };
    }
  }
}

// Export the singleton instance for use across the app
export const authService = AuthService.getInstance();