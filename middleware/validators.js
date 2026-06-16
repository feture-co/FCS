const { body, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  req.flash('error', errors.array().map(error => error.msg).join(' '));
  return res.redirect(req.get('Referrer') || '/login');
}

const loginRules = [
  body('email').custom((value) => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const isMobile = /^01\d{9}$/.test(value); // Matches 01xxxxxxxxx pattern
    if (!isEmail && !isMobile) {
      throw new Error('সঠিক ইমেইল অথবা মোবাইল নম্বর দিন।');
    }
    return true;
  }),
  body('password').notEmpty().withMessage('পাসওয়ার্ড দিন।')
];

const memberRules = [
  body('name').trim().notEmpty().withMessage('নাম দিন।'),
  body('mobile').trim().notEmpty().withMessage('মোবাইল দিন।'),
  body('email').isEmail().withMessage('সঠিক ইমেইল দিন।'),
  body('monthlyDeposit').isFloat({ min: 0 }).withMessage('মাসিক জমা সঠিক নয়।'),
  body('shares').isInt({ min: 1 }).withMessage('শেয়ার সংখ্যা সঠিক নয়।')
];

const depositRules = [
  body('memberId').isInt().withMessage('সদস্য নির্বাচন করুন।'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('মাস সঠিক নয়।'),
  body('year').isInt({ min: 2000 }).withMessage('বছর সঠিক নয়।'),
  body('amount').isFloat({ min: 0 }).withMessage('পরিমাণ সঠিক নয়।')
];

const moneyRules = [
  body('amount').isFloat({ min: 0 }).withMessage('পরিমাণ সঠিক নয়।')
];

const adminRules = [
  body('name').trim().notEmpty().withMessage('নাম দিন।'),
  body('mobile').trim().notEmpty().withMessage('মোবাইল দিন।'),
  body('email').isEmail().withMessage('সদস্যের ইমেইল সঠিক নয়।')
];

const memberDepositRules = [
  body('month').isInt({ min: 1, max: 12 }).withMessage('মাস সঠিক নয়।'),
  body('year').isInt({ min: 2000 }).withMessage('বছর সঠিক নয়。'),
  body('amount').isFloat({ min: 0 }).withMessage('পরিমাণ সঠিক নয়।')
];

module.exports = { handleValidation, loginRules, memberRules, depositRules, moneyRules, adminRules, memberDepositRules };
