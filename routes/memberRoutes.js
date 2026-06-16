const router = require('express').Router();
const member = require('../controllers/memberController');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { handleValidation, memberDepositRules } = require('../middleware/validators');

router.use(requireAuth, requireRole('member'));
router.get('/dashboard', member.dashboard);
router.get('/deposits', member.deposits);
router.post('/deposits', upload.single('receipt'), memberDepositRules, handleValidation, member.storeDepositRequest);
router.get('/statement', member.statement);
router.get('/notices', member.notices);
router.get('/profile', member.profile);
router.post('/profile/photo', upload.single('photo'), member.updateProfilePhoto);

module.exports = router;
