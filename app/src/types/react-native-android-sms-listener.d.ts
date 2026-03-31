declare module 'react-native-android-sms-listener' {
  interface SmsMessage {
    originatingAddress: string;
    body: string;
    timestamp: number;
  }

  interface Subscription {
    remove(): void;
  }

  const SmsListener: {
    addListener(listener: (message: SmsMessage) => void): Subscription;
  };

  export default SmsListener;
}
