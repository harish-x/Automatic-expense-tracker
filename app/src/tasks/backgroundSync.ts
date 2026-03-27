/**
 * backgroundSync.ts
 * Registers an Android background job that:
 *   1. Checks for new bank SMS
 *   2. Syncs unsynced transactions to the server
 *
 * Android WorkManager (via expo-background-task) will run this
 * roughly every 15 minutes even when the app is not open.
 *
 * IMPORTANT: TaskManager.defineTask() MUST be called at the module's
 * top level (not inside a function) so Android can find it on cold start.
 * This file must be imported in _layout.tsx before the app renders.
 */

import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { checkAndSaveSms } from '@/services/smsService';
import { syncTransactions } from '@/services/syncService';
import { logout } from '@/services/authService';

export const BACKGROUND_SYNC_TASK = 'finance-background-sync';

// ── Define the task (top-level, not inside any function) ────────────────────
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    await checkAndSaveSms();
    const result = await syncTransactions();
    if (result.authExpired) {
      await logout();
    }
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

// ─── Register / Unregister helpers ───────────────────────────────────────────

/** Call once on app start to activate the 15-minute background job. */
export async function registerBackgroundSync(): Promise<void> {
  // Don't register twice
  const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  if (alreadyRegistered) return;

  try {
    await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes (Android may run it less often to save battery)
    });
    console.log('[BG Sync] Background sync registered (every 15 min).');
  } catch (err) {
    console.log('[BG Sync] Could not register background task:', err);
  }
}

/** Optionally call this from Settings to disable background sync. */
export async function unregisterBackgroundSync(): Promise<void> {
  const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  if (registered) {
    await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    console.log('[BG Sync] Background sync unregistered.');
  }
}
