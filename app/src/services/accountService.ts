/**
 * accountService.ts
 * CRUD operations for bank accounts via the backend API.
 *
 * Endpoints (all require Bearer token):
 *   GET    /getAccounts
 *   POST   /createAccount   { bank_name, account_mask }
 *   PUT    /updateAccount?id=<id>   { bank_name?, account_mask? }
 *   DELETE /deleteAccount?id=<id>
 */

import axios from 'axios';

import { API_BASE_URL } from '@/constants/api';
import { getAccessToken, refreshAccessToken } from '@/services/authService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Account {
  id:           string;
  user:         string;
  bank_name:    string;
  account_mask: string;
  createdAt:    string;
  updatedAt:    string;
}

export interface AccountResult {
  account?:    Account;
  error?:      string;
  authExpired?: boolean;
}

export interface AccountsResult {
  accounts?:   Account[];
  error?:      string;
  authExpired?: boolean;
}

// ─── Token helper with auto-refresh ──────────────────────────────────────────

async function withRefresh<T>(call: (token: string) => Promise<T>): Promise<T> {
  let token = await getAccessToken();
  if (!token) {
    const e = new Error('Not authenticated') as Error & { authExpired: boolean };
    e.authExpired = true;
    throw e;
  }
  try {
    return await call(token);
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      // Access token expired — try refreshing once
      const newToken = await refreshAccessToken();
      if (!newToken) {
        const e = new Error('Session expired. Please log in again.') as Error & { authExpired: boolean };
        e.authExpired = true;
        throw e;
      }
      try {
        return await call(newToken);
      } catch (retryErr: unknown) {
        if (axios.isAxiosError(retryErr) && retryErr.response?.status === 401) {
          const e = new Error('Session expired. Please log in again.') as Error & { authExpired: boolean };
          e.authExpired = true;
          throw e;
        }
        throw retryErr;
      }
    }
    throw err;
  }
}

// ─── API calls ────────────────────────────────────────────────────────────────

/** Fetch all bank accounts for the logged-in user. */
export async function getAccounts(): Promise<AccountsResult> {
  try {
    const data = await withRefresh(async (token) => {
      const res = await axios.get(`${API_BASE_URL}/getAccounts`, {
        timeout: 15_000,
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    });
    return { accounts: data.accounts ?? [] };
  } catch (err: unknown) {
    return { error: extractError(err), authExpired: isAuthExpired(err) };
  }
}

/** Create a new bank account. */
export async function createAccount(bank_name: string, account_mask: string): Promise<AccountResult> {
  try {
    const data = await withRefresh(async (token) => {
      const res = await axios.post(
        `${API_BASE_URL}/createAccount`,
        { bank_name, account_mask },
        { timeout: 15_000, headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data;
    });
    return { account: data.account };
  } catch (err: unknown) {
    return { error: extractError(err), authExpired: isAuthExpired(err) };
  }
}

/** Update an existing bank account by ID. */
export async function updateAccount(
  id: string,
  bank_name: string,
  account_mask: string
): Promise<AccountResult> {
  try {
    const data = await withRefresh(async (token) => {
      const res = await axios.put(
        `${API_BASE_URL}/updateAccount?id=${encodeURIComponent(id)}`,
        { bank_name, account_mask },
        { timeout: 15_000, headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data;
    });
    return { account: data.account };
  } catch (err: unknown) {
    return { error: extractError(err), authExpired: isAuthExpired(err) };
  }
}

/** Delete a bank account by ID. */
export async function deleteAccount(id: string): Promise<{ error?: string; authExpired?: boolean }> {
  try {
    await withRefresh(async (token) => {
      await axios.delete(
        `${API_BASE_URL}/deleteAccount?id=${encodeURIComponent(id)}`,
        { timeout: 15_000, headers: { Authorization: `Bearer ${token}` } }
      );
    });
    return {};
  } catch (err: unknown) {
    return { error: extractError(err), authExpired: isAuthExpired(err) };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAuthExpired(err: unknown): boolean {
  if (err instanceof Error && (err as any).authExpired) return true;
  if (axios.isAxiosError(err) && err.response?.status === 401) return true;
  return false;
}

function extractError(err: unknown): string {
  if (err instanceof Error && (err as any).authExpired) return err.message;
  if (axios.isAxiosError(err) && err.response?.data?.error) {
    return String(err.response.data.error);
  }
  return err instanceof Error ? err.message : 'Unknown error';
}
