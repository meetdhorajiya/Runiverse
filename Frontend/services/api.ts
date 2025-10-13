// src/services/api.ts
import Constants from "expo-constants";

const normalize = (value: string) => (value.endsWith("/") ? value.slice(0, -1) : value);

const resolveBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  const configUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;

  if (envUrl) return normalize(envUrl);
  if (configUrl) return normalize(configUrl);

  return "https://runiverse.vercel.app";
};

const BASE_URL = "https://runiverse.onrender.com";

export const api = {
  baseURL: BASE_URL,

  async get<T>(path: string, token?: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GET ${path} failed: ${errText}`);
    }

    return res.json();
  },

  async post<T>(path: string, body: any, token?: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`POST ${path} failed: ${errText}`);
    }

    return res.json();
  },

  async put<T>(path: string, body: any, token?: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`PUT ${path} failed: ${errText}`);
    }

    return res.json();
  },

  async delete<T>(path: string, token?: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DELETE ${path} failed: ${errText}`);
    }

    return res.json();
  },
};
