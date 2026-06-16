const webPush = require('web-push');
const { PushSubscription, Notification, User } = require('../models');

function configurePush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (publicKey && privateKey) {
    webPush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', publicKey, privateKey);
  }
}

async function sendPush(title, body, type = 'notice') {
  await Notification.create({ title, body, type });
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  configurePush();
  const subscriptions = await PushSubscription.findAll({ include: User });
  await Promise.all(subscriptions.map(row => webPush.sendNotification({
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth }
  }, JSON.stringify({ title, body, url: '/member/notices' })).catch(() => row.destroy())));
}

module.exports = { configurePush, sendPush };
