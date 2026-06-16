const router = require('express').Router();
const auth = require('../controllers/authController');
const { redirectIfAuth } = require('../middleware/auth');
const { handleValidation, loginRules } = require('../middleware/validators');

router.get('/', (req, res) => {
  if (req.user) {
    return res.redirect(req.user.role === 'admin' ? '/admin/dashboard' : '/member/dashboard');
  }
  res.redirect('/login');
});
router.get('/login', redirectIfAuth, auth.showLogin);
router.post('/login', redirectIfAuth, loginRules, handleValidation, auth.login);
router.post('/logout', auth.logout);
router.get('/forgot-password', redirectIfAuth, auth.showForgot);
router.post('/forgot-password', redirectIfAuth, auth.sendReset);
router.get('/reset-password/:token', redirectIfAuth, auth.showReset);
router.post('/reset-password/:token', redirectIfAuth, auth.resetPassword);

module.exports = router;

