const router = require('express').Router();
const reports = require('../controllers/reportController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('admin'));
router.get('/', reports.index);
router.get('/:type/:format', reports.exportReport);

module.exports = router;
