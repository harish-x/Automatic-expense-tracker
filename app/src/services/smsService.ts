/**
 * smsService.ts
 * Reads bank SMS from the Android inbox, parses each one,
 * and saves new transactions to SQLite.
 *
 * Requires READ_SMS permission — asked once on first use.
 * Only works on Android (iOS has no SMS read API).
 */

import { PermissionsAndroid, Platform } from "react-native";
import SmsAndroid from "react-native-get-sms-android";
import SmsListener from "react-native-android-sms-listener";

import { insertTransaction, transactionExists } from "./dbService";
import { parseBankSms } from "@/utils/smsParser";

// ─── Permission ───────────────────────────────────────────────────────────────

/** Asks for READ_SMS and RECEIVE_SMS permissions if not already granted. Returns true if both granted. */
export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;

  const readAlready = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_SMS,
  );
  const receiveAlready = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
  );

  if (readAlready && receiveAlready) return true;

  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
  ]);

  return (
    results[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED &&
    results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED
  );
}

// ─── Read inbox ───────────────────────────────────────────────────────────────

/** Wraps the callback-based SmsAndroid.list in a Promise. */
function readSmsInbox(
  fromDate: number,
): Promise<Array<{ body: string; address: string; date: string }>> {
  return new Promise((resolve, reject) => {
    const filter = {
      box: "inbox",
      minDate: fromDate,
      bodyRegex:
        "(?s)^(?!.*(OTP|otp|one.?time.?password|verification.?code|login.?otp|transaction.?otp|secure.?code|passcode|2.?factor|2fa|" +
        "offer|promo|promotion|discount|cashback|reward|points.?redeemed|scratch.?card|claim.?now|limited.?time|" +
        "flat.?\\d+%|upto|free|FREE|Lifetime|lifetime|Credit.?Card|voucher|reminder|T\\&C|" +
        "hi |hello |dear |thanks.?for|warm.?greetings|regards|" +
        "https?://|www\\.|\\.in\\/|\\.com\\/)).*" +
        "(credited|debited|sent|deposited|withdrawn|charged|paid|transfer|withdraw|failed|declined|reversal|emi|ref|\\.Avl|" +
        "Rs\\.?\\s*\\d|INR\\s*\\d|A/?c|account|upi|imps|neft|rtgs|wallet).*$",
      maxCount: 100,
    };

    SmsAndroid.list(
      JSON.stringify(filter),
      (error: string) => reject(new Error(error)),
      (_count: number, smsList: string) => {
        try {
          const parsed = JSON.parse(smsList) as Array<{
            body: string;
            address: string;
            date: string;
          }>;
          resolve(parsed);
        } catch {
          resolve([]);
        }
      },
    );
  });
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Reads bank SMS since the last check, parses new ones, and inserts them into SQLite.
 * Returns the number of new transactions saved.
 */
export async function checkAndSaveSms(): Promise<number> {
  const hasPermission = await requestSmsPermission();
  if (!hasPermission) return 0;

  // Always scan from the start of the current calendar month
  // so the user can easily tally the current month's transactions.
  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let messages: Array<{ body: string; address: string; date: string }>;
  try {
    messages = await readSmsInbox(fromDate);
  } catch {
    // SMS read failed (e.g. permission revoked) — silently skip
    return 0;
  }

  let saved = 0;

  for (const sms of messages) {
    const parsed = parseBankSms(sms.body);
    if (!parsed) continue;

    // Avoid inserting duplicates (same ref number)
    if (parsed.refNumber) {
      const exists = await transactionExists(parsed.refNumber);
      if (exists) continue;
    }

    await insertTransaction({
      ...parsed,
      synced: 0,
      createdAt: new Date().toISOString(),
    });
    saved++;
  }

  return saved;
}

// ─── Real-time listener ───────────────────────────────────────────────────────

/**
 * Subscribes to incoming SMS in real-time.
 * Calls `onNewBankSms` immediately whenever a bank SMS arrives while the app is open.
 * Returns an unsubscribe function — call it on cleanup.
 */
export function startSmsListener(onNewBankSms: () => void): () => void {
  if (Platform.OS !== "android") return () => {};

  const subscription = SmsListener.addListener((message) => {
    if (/HDFC|ICICI|SBI|KOTAK|AXIS/i.test(message.originatingAddress ?? "") ||
        /HDFC|ICICI|SBI|KOTAK|AXIS/i.test(message.body)) {
      onNewBankSms();
    }
  });

  return () => subscription.remove();
}
