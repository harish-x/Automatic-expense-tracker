// Type declarations for react-native-get-sms-android
// (the library doesn't ship its own .d.ts file)
declare module 'react-native-get-sms-android' {
  export interface SmsFilter {
    box?: 'inbox' | 'sent' | 'draft' | 'outbox';
    minDate?: number;   // unix ms
    maxDate?: number;   // unix ms
    bodyRegex?: string; // Java regex matched against body
    read?: 0 | 1;
    address?: string;   // sender phone / short-code
    maxCount?: number;
    indexFrom?: number;
  }

  export interface SmsMessage {
    _id: number;
    thread_id: number;
    address: string;  // sender
    body: string;
    read: string;
    date: string;      // ms timestamp as string
    date_sent: string;
    type: string;
  }

  const SmsAndroid: {
    list(
      filter: string, // JSON.stringify(SmsFilter)
      fail: (error: string) => void,
      success: (count: number, smsList: string) => void
    ): void;
  };

  export default SmsAndroid;
}
