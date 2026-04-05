/**
 * Push notification infrastructure.
 *
 * Actual push sending is deferred until `web-push` is installed and VAPID keys
 * are configured. The subscription flow (DB storage, API routes, client-side
 * subscription) is fully functional.
 *
 * TODO: Install `web-push`, set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY +
 *       VAPID_SUBJECT env vars, then replace the no-op below with:
 *
 *   import webpush from "web-push";
 *   webpush.setVapidDetails(subject, publicKey, privateKey);
 *   await webpush.sendNotification(subscription, JSON.stringify(payload));
 */

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

/**
 * Send a push notification to a single subscription.
 * Currently a no-op — wire up web-push here when ready.
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<void> {
  // TODO: Replace with real web-push send once VAPID keys are configured.
  // Example:
  //   import webpush from "web-push";
  //   webpush.setVapidDetails(
  //     process.env.VAPID_SUBJECT!,
  //     process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  //     process.env.VAPID_PRIVATE_KEY!
  //   );
  //   await webpush.sendNotification(
  //     { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
  //     JSON.stringify(payload)
  //   );
  console.log(
    `[push] TODO: send push to endpoint ${subscription.endpoint.slice(0, 40)}… — "${payload.title}"`
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
