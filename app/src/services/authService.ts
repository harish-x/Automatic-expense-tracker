/**
 * authService.ts
 * Handles login, register, logout, and token refresh.
 * Tokens are stored in expo-secure-store (hardware-backed encryption on Android).
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import { API_BASE_URL } from '@/constants/api';
import { setSetting } from './dbService';

const ACCESS_TOKEN_KEY  = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id:    string;
  name:  string;
  email: string;
}

export interface AuthResult {
  user?:  AuthUser;
  error?: string;
}

// ─── Token helpers ────────────────────────────────────────────────────────────

async function storeTokens(accessToken: string, refreshToken: string, user: AuthUser): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  // Store email in SQLite settings for display in Settings screen
  await setSetting('user_email', user.email);
  await setSetting('user_name', user.name);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  return !!token;
}

// ─── Auth actions ─────────────────────────────────────────────────────────────

export async function register(name: string, email: string, password: string): Promise<AuthResult> {
  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/register`,
      { name, email, password },
      { timeout: 15_000 }
    );
    await storeTokens(data.accessToken, data.refreshToken, data.user);
    return { user: data.user };
  } catch (err: unknown) {
    return { error: extractError(err) };
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/login`,
      { email, password },
      { timeout: 15_000 }
    );
    await storeTokens(data.accessToken, data.refreshToken, data.user);
    return { user: data.user };
  } catch (err: unknown) {
    return { error: extractError(err) };
  }
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

/**
 * Uses the stored refresh token to get a new access token.
 * Returns the new access token, or null if refresh failed (forces re-login).
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;

    const { data } = await axios.post(
      `${API_BASE_URL}/refreshToken`,
      { refreshToken },
      { timeout: 15_000 }
    );
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
    return data.accessToken;
  } catch {
    await logout();
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractError(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.error) {
    return String(err.response.data.error);
  }
  return err instanceof Error ? err.message : 'Unknown error';
}
