const crypto = require('crypto');
const { User } = require('../models');
const { issueToken, cookieName } = require('../middleware/auth');
const { Op } = require('sequelize');

exports.showLogin = (req, res) => res.render('auth/login', { title: 'লগইন' });

exports.login = async (req, res) => {
  const { email, password, remember } = req.body;
  const user = await User.findOne({
    where: {
      [Op.or]: [
        { email: email || '' },
        { mobile: email || '' }
      ]
    }
  });
  if (!user || !user.isActive || !(await user.comparePassword(password))) {
    req.flash('error', 'ইমেইল/মোবাইল অথবা পাসওয়ার্ড সঠিক নয়।');
    return res.redirect('/login');
  }
  user.lastLoginAt = new Date();
  await user.save();
  issueToken(res, user, remember === 'on');
  return res.redirect(user.role === 'admin' ? '/admin/dashboard' : '/member/dashboard');
};

exports.logout = (req, res) => {
  res.clearCookie(cookieName);
  req.flash('success', 'আপনি সফলভাবে লগআউট করেছেন।');
  res.redirect('/login');
};

exports.showForgot = (req, res) => res.render('auth/forgot', { title: 'পাসওয়ার্ড রিসেট' });

exports.sendReset = async (req, res) => {
  const user = await User.findOne({ where: { email: req.body.email } });
  if (user) {
    user.resetToken = crypto.randomBytes(24).toString('hex');
    user.resetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    req.flash('success', `ডেমো রিসেট লিংক: /reset-password/${user.resetToken}`);
  } else {
    req.flash('success', 'ইমেইল থাকলে রিসেট নির্দেশনা পাঠানো হবে।');
  }
  res.redirect('/forgot-password');
};

exports.showReset = async (req, res) => res.render('auth/reset', { title: 'নতুন পাসওয়ার্ড', token: req.params.token });

exports.resetPassword = async (req, res) => {
  const user = await User.findOne({ where: { resetToken: req.params.token } });
  if (!user || !user.resetExpires || user.resetExpires < new Date()) {
    req.flash('error', 'রিসেট লিংকটি মেয়াদোত্তীর্ণ।');
    return res.redirect('/forgot-password');
  }
  user.password = req.body.password;
  user.resetToken = null;
  user.resetExpires = null;
  await user.save();
  req.flash('success', 'পাসওয়ার্ড পরিবর্তন হয়েছে।');
  res.redirect('/login');
};
