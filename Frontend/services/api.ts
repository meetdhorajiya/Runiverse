// Simple API wrapper for backend communication
// Temporary manual override for development - change this back later!
const BASE_URL = 'http://10.13.10.244:5000';

export interface ApiResponse<T=any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  
  // Debug logging for EAS builds
  if (__DEV__) {
    console.log(`API Request: ${options.method || 'GET'} ${url}`);
    console.log('Request options:', JSON.stringify(options, null, 2));
  }
  
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options,
    });
    
    const text = await res.text();
    let json: any = {};
    
    try { 
      json = text ? JSON.parse(text) : {}; 
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', text);
      throw new Error('Invalid JSON response from server');
    }
    
    if (!res.ok) {
      const msg = json.msg || json.error || json.message || res.statusText || 'Request failed';
      console.error(`API Error ${res.status}:`, msg);
      throw new Error(msg);
    }
    
    if (__DEV__) {
      console.log('API Response:', json);
    }
    
    return json as T;
  } catch (error: any) {
    console.error('Network request failed:', error);
    
    // Provide more helpful error messages for common issues
    if (error.message === 'Network request failed' || error.message === 'Failed to fetch') {
      throw new Error(`Cannot connect to server at ${BASE_URL}. Please check your internet connection and server status.`);
    }
    
    throw error;
  }
}

export const api = {
  post: <T>(path: string, body: any, token?: string) => request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }),
  get:  <T>(path: string, token?: string) => request<T>(path, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }),
  put:  <T>(path: string, body: any, token?: string) => request<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }),
};

export default api;
