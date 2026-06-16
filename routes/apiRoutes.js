const router = require('express').Router();
const api = require('../controllers/apiController');
const { generateMonthlyDues } = require('../jobs/dueCron');
const { sendDueRemindersToAll } = require('../services/reminderService');

router.get('/vapid-public-key', api.vapidKey);
router.post('/push/subscribe', api.subscribe);

// Vercel Cron endpoints
router.get('/cron/due-reminders', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const report = await sendDueRemindersToAll();
    return res.json({ success: true, message: 'Cron reminder completed', report });
  } catch (error) {
    console.error('Vercel Cron Reminder error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/cron/monthly-dues', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    await generateMonthlyDues(new Date(), false);
    return res.json({ success: true, message: 'Cron monthly dues generation completed' });
  } catch (error) {
    console.error('Vercel Cron Monthly Dues error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
