const prisma = require('../lib/prisma');

let webpush = null;
try {
  webpush = require('web-push');
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      'mailto:admin@ccbmart.vn',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    console.log('[Push] VAPID configured');
  } else {
    console.log('[Push] No VAPID keys, push notifications disabled');
    webpush = null;
  }
} catch { console.log('[Push] web-push not available'); }

async function sendPushNotification(userId, title, body, data = {}) {
  if (!webpush) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, data, icon: '/icons/icon-192x192.png' })
      );
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }
  }
}

async function subscribeUser(userId, subscription, userAgent) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: userAgent || null,
    },
    update: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
  });
}

async function unsubscribeUser(endpoint) {
  return prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

module.exports = { sendPushNotification, subscribeUser, unsubscribeUser };
