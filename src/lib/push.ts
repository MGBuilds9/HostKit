import webpush from "web-push";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

const vapidSubject = process.env.VAPID_SUBJECT;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

const pushEnabled =
  typeof window === "undefined" && !!vapidSubject && !!vapidPublicKey && !!vapidPrivateKey;

if (pushEnabled) {
  webpush.setVapidDetails(vapidSubject!, vapidPublicKey!, vapidPrivateKey!);
}

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<void> {
  if (!pushEnabled) {
    console.log(`[push] VAPID not configured — skipping push to ${subscription.endpoint.slice(0, 40)}…`);
    return;
  }
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload)
  );
}

/**
 * Send a push notification to all subscriptions for a user.
 * Pass in pre-fetched subscriptions to avoid an extra DB round-trip.
 */
export async function sendPushToSubscriptions(
  subscriptions: PushSubscriptionData[],
  payload: PushPayload
): Promise<void> {
  if (subscriptions.length === 0) return;
  await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, payload))
  );
}
