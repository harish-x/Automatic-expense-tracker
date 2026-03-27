/**
 * useTransactions.ts
 * Central data hook — loads transactions from SQLite and computes summary numbers.
 * Call reload() after any write to refresh the UI.
 */

import { useCallback, useEffect, useState } from 'react';

import { getAllTransactions } from '@/services/dbService';
import { Category } from '@/types';
import type { Summary, Transaction } from '@/types';

export interface CategoryTotal {
  category: Category;
  total: number;
}

export interface DailyTotal {
  date: string;   // "YYYY-MM-DD"
  expense: number;
  income: number;
}

export interface UseTransactionsReturn {
  transactions: Transaction[];
  summary: Summary;
  categoryTotals: CategoryTotal[];   // for the pie chart
  dailyTotals: DailyTotal[];         // last 7 days, for the line chart
  loading: boolean;
  reload: () => Promise<void>;
}

export function useTransactions(): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [summary, setSummary]           = useState<Summary>({ income: 0, expense: 0, balance: 0 });
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [dailyTotals, setDailyTotals]       = useState<DailyTotal[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const txns = await getAllTransactions();
      setTransactions(txns);

      // ── Summary ──────────────────────────────────────────────────────────
      const income  = txns.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
      const expense = txns.filter((t) => t.type !== 'credit').reduce((s, t) => s + t.amount, 0);
      setSummary({ income, expense, balance: income - expense });

      // ── Category totals (for pie chart — expense only) ───────────────────
      const catMap: Partial<Record<Category, number>> = {};
      for (const t of txns) {
        if (t.type === 'credit') continue; // income not shown in spending pie
        catMap[t.category] = (catMap[t.category] ?? 0) + t.amount;
      }
      const catTotals: CategoryTotal[] = Object.entries(catMap)
        .map(([cat, total]) => ({ category: cat as Category, total: total as number }))
        .sort((a, b) => b.total - a.total);
      setCategoryTotals(catTotals);

      // ── Daily totals — last 7 days (for line chart) ──────────────────────
      const today = new Date();
      const last7: DailyTotal[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        const date = d.toISOString().split('T')[0];

        const dayTxns = txns.filter((t) => t.date === date);
        const exp = dayTxns.filter((t) => t.type !== 'credit').reduce((s, t) => s + t.amount, 0);
        const inc = dayTxns.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
        return { date, expense: exp, income: inc };
      });
      setDailyTotals(last7);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { transactions, summary, categoryTotals, dailyTotals, loading, reload };
}
