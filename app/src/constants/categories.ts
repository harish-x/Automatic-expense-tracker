import { Category } from '@/types';

// Color for each category used in charts and transaction list
export const CATEGORY_COLORS: Record<Category, string> = {
  income:        '#10B981', // green
  food:          '#F59E0B', // amber
  transport:     '#3B82F6', // blue
  shopping:      '#8B5CF6', // purple
  entertainment: '#EC4899', // pink
  utilities:     '#6B7280', // slate
  health:        '#EF4444', // red
  transfer:      '#14B8A6', // teal
  fee:           '#F97316', // orange
  other:         '#9CA3AF', // gray
};

// Emoji icon for each category (shown in transaction list)
export const CATEGORY_ICONS: Record<Category, string> = {
  income:        '💰',
  food:          '🍔',
  transport:     '🚗',
  shopping:      '🛍️',
  entertainment: '🎬',
  utilities:     '💡',
  health:        '🏥',
  transfer:      '↔️',
  fee:           '📋',
  other:         '📦',
};

// Human-readable label for each category
export const CATEGORY_LABELS: Record<Category, string> = {
  income:        'Income',
  food:          'Food',
  transport:     'Transport',
  shopping:      'Shopping',
  entertainment: 'Entertainment',
  utilities:     'Utilities',
  health:        'Health',
  transfer:      'Transfer',
  fee:           'Bank Fee',
  other:         'Other',
};

// Keywords used to auto-detect category from merchant name or SMS body
// Checked in order — first match wins
export const CATEGORY_RULES: { keywords: string[]; category: Category }[] = [
  {
    keywords: ['salary', 'deposited', 'jokar', 'tpt', 'neft', 'imps inward', 'credit'],
    category: 'income',
  },
  {
    keywords: ['swiggy', 'zomato', 'domino', 'kfc', 'mcdonalds', 'burger', 'restaurant', 'hotel', 'food', 'cafe', 'bakery', 'dhaba', 'biryani'],
    category: 'food',
  },
  {
    keywords: ['uber', 'ola', 'rapido', 'metro', 'bus', 'auto', 'fuel', 'petrol', 'diesel', 'irctc', 'railway', 'redbus'],
    category: 'transport',
  },
  {
    keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'shop', 'store', 'mart', 'mall', 'stationar', 'aarav'],
    category: 'shopping',
  },
  {
    keywords: ['tasmac', 'pvr', 'inox', 'cinema', 'netflix', 'spotify', 'youtube', 'game', 'bookmyshow'],
    category: 'entertainment',
  },
  {
    keywords: ['electricity', 'water', 'gas', 'broadband', 'jio', 'airtel', 'vi ', 'bsnl', 'recharge', 'bill', 'dtv', 'tata sky'],
    category: 'utilities',
  },
  {
    keywords: ['hospital', 'pharmacy', 'medical', 'clinic', 'doctor', 'health', 'apollo', 'medplus', 'netmeds'],
    category: 'health',
  },
  {
    keywords: ['low balance', 'gst charged', 'fine', 'penalty', 'charge', 'fee', 'interest'],
    category: 'fee',
  },
  {
    // Person-to-person UPI transfers — not a known merchant
    keywords: ['@ptyes', '@okicici', '@okaxis', '@ybl', '@paytm', 'sent'],
    category: 'transfer',
  },
];
