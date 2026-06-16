const { PushSubscription } = require('../models');

exports.vapidKey = (req, res) => res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });

exports.subscribe = async (req, res) => {
  const subscription = req.body;
  if (!subscription.endpoint || !subscription.keys) return res.status(422).json({ message: 'Invalid subscription' });
  await PushSubscription.findOrCreate({
    where: { endpoint: subscription.endpoint },
    defaults: {
      userId: req.user ? req.user.id : null,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth
    }
  });
  res.json({ ok: true });
};
