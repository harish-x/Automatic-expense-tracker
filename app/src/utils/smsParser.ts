/**
 * smsParser.ts
 * Parses raw HDFC bank SMS into structured transaction objects.
 *
 * Covered message types (from real samples):
 *  1. Credit via UPI   — "Rs.10.00 credited to HDFC Bank A/c XX9910 on 25-03-26 from VPA …"
 *  2. Salary / deposit — "INR 23,000.00 deposited in HDFC Bank A/c XX9910 on 05-MAR-26 for …"
 *  3. UPI debit (Sent) — "Sent Rs.50.00 From HDFC Bank A/C *9910 To … On 24/03/26 Ref …"
 *  4. Bank fee         — "Rs.209.74 +GST charged for low balance in your HDFC Bank A/c …"
 */

import { BankName, Transaction, TransactionType } from '@/types';
import { categorize } from './categorizer';

// ─── Amount helpers ───────────────────────────────────────────────────────────

/** "23,000.00" → 23000 */
function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g, ''));
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

/**
 * Converts HDFC date strings to ISO "YYYY-MM-DD".
 * Handles: "25-03-26", "24/03/26", "05-MAR-26"
 */
function parseHDFCDate(raw: string): string {
  // DD-MM-YY  or  DD/MM/YY
  const numeric = raw.match(/^(\d{2})[-\/](\d{2})[-\/](\d{2})$/);
  if (numeric) {
    const [, dd, mm, yy] = numeric;
    return `20${yy}-${mm}-${dd}`;
  }
  // DD-MMM-YY  (e.g. 05-MAR-26)
  const alpha = raw.match(/^(\d{2})-([A-Z]{3})-(\d{2})$/i);
  if (alpha) {
    const [, dd, mon, yy] = alpha;
    const mm = MONTH_MAP[mon.toUpperCase()] ?? '01';
    return `20${yy}-${mm}-${dd}`;
  }
  // Fallback: today
  return new Date().toISOString().split('T')[0];
}

// ─── HDFC patterns ────────────────────────────────────────────────────────────

/**
 * Pattern 1 — Credit via UPI / IMPS
 * "Rs.10.00 credited to HDFC Bank A/c XX9910 on 25-03-26 from VPA 7449259361@ptyes (UPI 601554082306)"
 */
const HDFC_CREDIT_UPI =
  /Rs\.([\d,]+\.?\d*)\s+credited to HDFC Bank A\/c\s+[X*\d]+(\d{4})\s+on\s+([\d\-\/]+)\s+from VPA\s+([\w.\-@]+)(?:\s+\(UPI\s+(\d+)\))?/i;

/**
 * Pattern 2 — Salary / NEFT deposit
 * "INR 23,000.00 deposited in HDFC Bank A/c XX9910 on 05-MAR-26 for XXXXXXXXXX8720-TPT-Salary Feb 2026-JOKAR…"
 */
const HDFC_DEPOSIT =
  /INR\s+([\d,]+\.?\d*)\s+deposited in HDFC Bank A\/c\s+[X*\d]+(\d{4})\s+on\s+([\d\-A-Z]+)\s+for\s+(.+?)(?:\.Avl|$)/i;

/**
 * Pattern 3 — UPI Debit (Sent)
 * "Sent Rs.50.00\nFrom HDFC Bank A/C *9910\nTo Yazhini Dharmaraja\nOn 24/03/26\nRef 120529871683"
 */
const HDFC_DEBIT_UPI =
  /Sent Rs\.([\d,]+\.?\d*)\s+From HDFC Bank A\/C \*(\d{4})\s+To (.+?)\s+On ([\d\/]+)\s+Ref (\d+)/is;

/**
 * Pattern 4 — Bank fee / GST charge
 * "Rs.209.74 +GST charged for low balance in your HDFC Bank A/c X9910"
 */
const HDFC_FEE =
  /Rs\.([\d,]+\.?\d*)\s+\+GST charged for (.+?) in your HDFC Bank A\/c\s+[X*\d]+(\d{4})/i;

// ─── Main parser ──────────────────────────────────────────────────────────────

/** Returns a partially-built Transaction (without id / synced / createdAt), or null if unrecognised. */
export function parseHDFCSms(
  body: string
): Omit<Transaction, 'id' | 'synced' | 'createdAt'> | null {
  const bank: BankName = 'HDFC';

  // ── Pattern 1: Credit via UPI ──────────────────────────────────────────
  let m = body.match(HDFC_CREDIT_UPI);
  if (m) {
    const [, rawAmount, last4, rawDate, vpa, upiRef] = m;
    const amount   = parseAmount(rawAmount);
    const merchant = vpa;
    const date     = parseHDFCDate(rawDate);
    const type: TransactionType = 'credit';
    return {
      bank, type, amount, merchant,
      account:   last4,
      refNumber: upiRef,
      date,
      category:  categorize(merchant, body, type),
      rawSms:    body,
    };
  }

  // ── Pattern 2: Salary / NEFT deposit ──────────────────────────────────
  m = body.match(HDFC_DEPOSIT);
  if (m) {
    const [, rawAmount, last4, rawDate, description] = m;
    const amount   = parseAmount(rawAmount);
    // Shorten long salary references to the company name part
    const merchant = description.split('-').pop()?.trim() ?? description.trim();
    const date     = parseHDFCDate(rawDate);
    const type: TransactionType = 'credit';
    return {
      bank, type, amount, merchant,
      account:   last4,
      date,
      category:  categorize(merchant, body, type),
      rawSms:    body,
    };
  }

  // ── Pattern 3: UPI Debit ───────────────────────────────────────────────
  m = body.match(HDFC_DEBIT_UPI);
  if (m) {
    const [, rawAmount, last4, recipient, rawDate, ref] = m;
    const amount   = parseAmount(rawAmount);
    const merchant = recipient.trim();
    const date     = parseHDFCDate(rawDate);
    const type: TransactionType = 'debit';
    return {
      bank, type, amount, merchant,
      account:   last4,
      refNumber: ref,
      date,
      category:  categorize(merchant, body, type),
      rawSms:    body,
    };
  }

  // ── Pattern 4: Bank fee ────────────────────────────────────────────────
  m = body.match(HDFC_FEE);
  if (m) {
    const [, rawAmount, reason, last4] = m;
    const amount   = parseAmount(rawAmount);
    const merchant = `Bank fee: ${reason.trim()}`;
    const type: TransactionType = 'fee';
    return {
      bank, type, amount, merchant,
      account:   last4,
      date:      new Date().toISOString().split('T')[0],
      category:  'fee',
      rawSms:    body,
    };
  }

  // Not an HDFC transaction message we recognise
  return null;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/**
 * Try to parse any supported bank SMS.
 * Returns null if the SMS is not from a supported bank or format.
 */
export function parseBankSms(
  body: string
): Omit<Transaction, 'id' | 'synced' | 'createdAt'> | null {
  // HDFC detection: look for "HDFC" in the body
  if (/HDFC/i.test(body)) {
    return parseHDFCSms(body);
  }
  // Kotak — add when you have sample messages
  return null;
}
