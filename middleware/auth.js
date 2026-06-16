const jwt = require('jsonwebtoken');
const { User, Member } = require('../models');

const cookieName = 'bondhu_token';

async function attachUser(req, res, next) {
  try {
    const token = req.cookies[cookieName];
    if (!token) return next();
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-jwt-secret');
    const user = await User.findByPk(payload.id, { include: Member });
    if (user && user.isActive) req.user = user;
  } catch (error) {
    res.clearCookie(cookieName);
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    req.flash('error', 'প্রথমে লগইন করুন।');
    return res.redirect('/login');
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      req.flash('error', 'এই পাতায় প্রবেশের অনুমতি নেই।');
      return res.redirect('/login');
    }
    next();
  };
}

function redirectIfAuth(req, res, next) {
  if (req.user) {
    return res.redirect(req.user.role === 'admin' ? '/admin/dashboard' : '/member/dashboard');
  }
  next();
}

function issueToken(res, user, remember = false) {
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'dev-jwt-secret', {
    expiresIn: remember ? '30d' : (process.env.JWT_EXPIRES_IN || '7d')
  });
  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
  });
}

module.exports = { attachUser, requireAuth, requireRole, redirectIfAuth, issueToken, cookieName };

