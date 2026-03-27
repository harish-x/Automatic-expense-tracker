/**
 * categorizer.ts
 * Auto-assigns a Category to a transaction based on merchant name + SMS body.
 */

import { CATEGORY_RULES } from '@/constants/categories';
import { Category, TransactionType } from '@/types';

/**
 * Looks at the merchant name and raw SMS body and returns the best-matching category.
 *
 * @param merchant - parsed merchant / recipient name
 * @param rawSms   - full original SMS (used as extra signal)
 * @param type     - 'credit' | 'debit' | 'fee'
 */
export function categorize(
  merchant: string,
  rawSms: string,
  type: TransactionType
): Category {
  // Bank fees are always 'fee'
  if (type === 'fee') return 'fee';

  // Build one lowercase string to search through
  const haystack = `${merchant} ${rawSms}`.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
      return rule.category;
    }
  }

  // Credits we couldn't categorise → income (safe default for unknown deposits)
  if (type === 'credit') return 'income';

  return 'other';
}
