/**
 * dbService.ts
 * All SQLite read/write operations.
 * Uses expo-sqlite v15 (Expo SDK 55 API).
 */

import * as SQLite from 'expo-sqlite';
import { Transaction, TransactionRow } from '@/types';

// Cached database connection (opened once, reused)
let _db: SQLite.SQLiteDatabase | null = null;

// ─── Open / Init ─────────────────────────────────────────────────────────────

async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;

  _db = await SQLite.openDatabaseAsync('finance.db');

  // WAL mode makes reads/writes faster on Android
  await _db.execAsync('PRAGMA journal_mode = WAL;');

  // Create tables if they don't exist yet
  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      bank        TEXT    NOT NULL,
      type        TEXT    NOT NULL,
      amount      REAL    NOT NULL,
      merchant    TEXT    NOT NULL,
      account     TEXT    NOT NULL,
      ref_number  TEXT,
      date        TEXT    NOT NULL,
      category    TEXT    NOT NULL,
      raw_sms     TEXT    NOT NULL,
      synced      INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  return _db;
}

// ─── Helper: convert DB row → Transaction object ──────────────────────────────

function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id:         row.id,
    bank:       row.bank,
    type:       row.type,
    amount:     row.amount,
    merchant:   row.merchant,
    account:    row.account,
    refNumber:  row.ref_number ?? undefined,
    date:       row.date,
    category:   row.category,
    rawSms:     row.raw_sms,
    synced:     row.synced,
    createdAt:  row.created_at,
  };
}

// ─── Transactions ─────────────────────────────────────────────────────────────

/** Save a new transaction. Returns the new row id. */
export async function insertTransaction(t: Omit<Transaction, 'id'>): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    `INSERT INTO transactions
      (bank, type, amount, merchant, account, ref_number, date, category, raw_sms, synced, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      t.bank,
      t.type,
      t.amount,
      t.merchant,
      t.account,
      t.refNumber ?? null,
      t.date,
      t.category,
      t.rawSms,
      t.createdAt,
    ]
  );
  return result.lastInsertRowId;
}

/** Check if a transaction with this ref number already exists (avoids duplicates). */
export async function transactionExists(refNumber: string): Promise<boolean> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE ref_number = ?',
    [refNumber]
  );
  return (row?.count ?? 0) > 0;
}

/** Get all transactions, newest first. */
export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<TransactionRow>(
    'SELECT * FROM transactions ORDER BY date DESC, id DESC'
  );
  return rows.map(rowToTransaction);
}

/** Get transactions that haven't been synced to the server yet. */
export async function getUnsyncedTransactions(): Promise<Transaction[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<TransactionRow>(
    'SELECT * FROM transactions WHERE synced = 0 ORDER BY date ASC'
  );
  return rows.map(rowToTransaction);
}

/** Mark a list of transaction ids as synced. */
export async function markAsSynced(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDB();
  // Build a placeholder string like "?,?,?"
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE transactions SET synced = 1 WHERE id IN (${placeholders})`,
    ids
  );
}

/** Delete all transactions (used in Settings → Clear Data). */
export async function clearAllTransactions(): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM transactions');
}

// ─── Settings ─────────────────────────────────────────────────────────────────

/** Read a settings value by key. Returns null if not found. */
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

/** Write (insert or update) a settings value. */
export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
}
