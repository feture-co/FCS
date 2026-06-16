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

const { User } = require('../models');
router.get('/debug-db', async (req, res) => {
  try {
    const userCount = await User.count();
    return res.json({
      success: true,
      message: 'Database connected successfully',
      env: {
        DB_HOST: process.env.DB_HOST,
        DB_NAME: process.env.DB_NAME,
        DB_USER: process.env.DB_USER,
        DB_PORT: process.env.DB_PORT,
        DB_SSL: process.env.DB_SSL,
        NODE_ENV: process.env.NODE_ENV
      },
      userCount
    });
  } catch (error) {
    return res.json({
      success: false,
      error: error.message,
      stack: error.stack,
      env: {
        DB_HOST: process.env.DB_HOST,
        DB_NAME: process.env.DB_NAME,
        DB_USER: process.env.DB_USER,
        DB_PORT: process.env.DB_PORT,
        DB_SSL: process.env.DB_SSL,
        NODE_ENV: process.env.NODE_ENV
      }
    });
  }
});

module.exports = router;
