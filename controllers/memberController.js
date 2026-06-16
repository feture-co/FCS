const xss = require('xss');
const { Op } = require('sequelize');
const fs = require('fs').promises;
const cloudinaryService = require('../services/cloudinaryService');
const { Member, Deposit, DepositRequest, Due, ProfitDistribution, Transaction, Notice, Investment } = require('../models');
const { getFundStats, currentBalance } = require('../services/fundService');
const { generateMonthlyDues } = require('../jobs/dueCron');

async function getMember(req) {
  return Member.findOne({ where: { userId: req.user.id } });
}

exports.dashboard = async (req, res) => {
  const member = await getMember(req);
  if (!member) {
    req.flash('error', 'আপনার সদস্য প্রোফাইল পাওয়া যায়নি।');
    return res.redirect('/login');
  }
  const [stats, totalDeposit, allDues, totalProfit, balance, recentDeposits, recentNotices, activeInvestments] = await Promise.all([
    getFundStats(),
    Deposit.sum('amount', { where: { memberId: member.id } }),
    Due.findAll({
      where: { memberId: member.id },
      order: [['year', 'DESC'], ['month', 'DESC']]
    }),
    ProfitDistribution.sum('amount', { where: { memberId: member.id } }),
    currentBalance(member.id),
    Deposit.findAll({
      where: { memberId: member.id },
      limit: 5,
      order: [['depositDate', 'DESC']]
    }),
    Notice.findAll({
      limit: 3,
      order: [['publishDate', 'DESC']]
    }),
    Investment.findAll({
      where: { status: 'active' },
      limit: 2,
      order: [['investmentDate', 'DESC']]
    })
  ]);

  let pendingDues = [];
  let totalDue = 0;
  if (allDues.length > 0) {
    const latestDue = allDues[0];
    totalDue = Number(latestDue.totalDue || 0);
    const monthlyDeposit = Number(member.monthlyDeposit || 1);
    if (totalDue > 0) {
      const N = Math.ceil(totalDue / monthlyDeposit);
      pendingDues = allDues.slice(0, N).reverse();
    }
  }

  res.render('member/dashboard', { 
    title: 'আমার ড্যাশবোর্ড', 
    member, 
    stats, 
    totalDeposit: totalDeposit || 0, 
    totalDue, 
    pendingDues,
    totalProfit: totalProfit || 0, 
    balance,
    recentDeposits,
    recentNotices,
    activeInvestments
  });
};

exports.statement = async (req, res) => {
  const member = await getMember(req);
  if (!member) {
    req.flash('error', 'আপনার সদস্য প্রোফাইল পাওয়া যায়নি।');
    return res.redirect('/login');
  }
  const transactions = await Transaction.findAll({ where: { memberId: member.id }, order: [['transactionDate', 'ASC']] });
  res.render('member/statement', { title: 'স্টেটমেন্ট', transactions });
};

exports.deposits = async (req, res) => {
  const member = await getMember(req);
  if (!member) {
    req.flash('error', 'আপনার সদস্য প্রোফাইল পাওয়া যায়নি।');
    return res.redirect('/login');
  }
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  await generateMonthlyDues(now, false);
  const [requests, deposits, due, paidThisMonth, pendingThisMonth] = await Promise.all([
    DepositRequest.findAll({ where: { memberId: member.id }, order: [['createdAt', 'DESC']] }),
    Deposit.findAll({ where: { memberId: member.id }, order: [['depositDate', 'DESC']] }),
    Due.findOne({ where: { memberId: member.id, month, year } }),
    Deposit.sum('amount', { where: { memberId: member.id, month, year } }),
    DepositRequest.sum('amount', { where: { memberId: member.id, month, year, status: 'pending' } })
  ]);
  res.render('member/deposits', {
    title: 'জমা অনুরোধ',
    member,
    requests,
    deposits,
    due,
    month,
    year,
    paidThisMonth: paidThisMonth || 0,
    pendingThisMonth: pendingThisMonth || 0
  });
};

exports.storeDepositRequest = async (req, res) => {
  const member = await getMember(req);
  if (!member) {
    req.flash('error', 'আপনার সদস্য প্রোফাইল পাওয়া যায়নি।');
    return res.redirect('/login');
  }

  let receiptValue = null;
  if (req.file) {
    const cloudinaryUrl = await cloudinaryService.uploadImage(req.file.path, 'receipt');
    if (cloudinaryUrl) {
      receiptValue = cloudinaryUrl;
      await fs.unlink(req.file.path).catch(err => console.error('Error deleting temp file:', err));
    } else {
      receiptValue = req.file.filename;
    }
  }

  await DepositRequest.create({
    memberId: member.id,
    month: req.body.month,
    year: req.body.year,
    amount: req.body.amount,
    depositDate: req.body.depositDate,
    note: xss(req.body.note || ''),
    receipt: receiptValue
  });
  req.flash('success', 'আপনার জমা অনুরোধ পাঠানো হয়েছে। অ্যাডমিন অনুমোদন করলে জমা হিসেবে যুক্ত হবে।');
  res.redirect('/member/deposits');
};

exports.notices = async (req, res) => {
  const notices = await Notice.findAll({ order: [['publishDate', 'DESC']] });
  res.render('member/notices', { title: 'নোটিশ', notices });
};

exports.profile = async (req, res) => {
  const member = await getMember(req);
  if (!member) {
    req.flash('error', 'আপনার সদস্য প্রোফাইল পাওয়া যায়নি।');
    return res.redirect('/login');
  }
  
  // Get all due records sorted by date DESC
  const allDues = await Due.findAll({
    where: { memberId: member.id },
    order: [['year', 'DESC'], ['month', 'DESC']]
  });

  let pendingDues = [];
  if (allDues.length > 0) {
    const latestDue = allDues[0];
    const totalDue = Number(latestDue.totalDue || 0);
    const monthlyDeposit = Number(member.monthlyDeposit || 1);
    if (totalDue > 0) {
      const N = Math.ceil(totalDue / monthlyDeposit);
      // Take the latest N records and reverse them to ASC order
      pendingDues = allDues.slice(0, N).reverse();
    }
  }

  res.render('member/profile', { title: 'আমার প্রোফাইল', member, pendingDues });
};

exports.updateProfilePhoto = async (req, res) => {
  const member = await getMember(req);
  if (!member) {
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
      return res.status(404).json({ success: false, message: 'আপনার সদস্য প্রোফাইল পাওয়া যায়নি।' });
    }
    req.flash('error', 'আপনার সদস্য প্রোফাইল পাওয়া যায়নি।');
    return res.redirect('/login');
  }

  if (!req.file) {
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
      return res.status(400).json({ success: false, message: 'কোনো ছবি নির্বাচন করা হয়নি অথবা আপলোডকৃত ফাইলটি সঠিক ইমেজ ফরম্যাটে (PNG, JPG, JPEG) নয়।' });
    }
    req.flash('error', 'কোনো ছবি নির্বাচন করা হয়নি অথবা আপলোডকৃত ফাইলটি সঠিক ইমেজ ফরম্যাটে (PNG, JPG, JPEG) নয়।');
    return res.redirect('/member/profile');
  }

  try {
    const cloudinaryUrl = await cloudinaryService.uploadImage(req.file.path, 'avatar');
    let photoValue;
    if (cloudinaryUrl) {
      photoValue = cloudinaryUrl;
      await fs.unlink(req.file.path).catch(err => console.error('Error deleting temp file:', err));
    } else {
      photoValue = req.file.filename;
    }

    await member.update({ photo: photoValue });
    
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
      return res.json({ success: true, message: 'প্রোফাইল ছবি সফলভাবে আপডেট করা হয়েছে।', photoUrl: cloudinaryUrl || `/uploads/${photoValue}` });
    }
    req.flash('success', 'প্রোফাইল ছবি সফলভাবে আপডেট করা হয়েছে।');
  } catch (error) {
    console.error('Error updating profile photo:', error);
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
      return res.status(500).json({ success: false, message: 'প্রোফাইল ছবি আপডেট করতে সমস্যা হয়েছে।' });
    }
    req.flash('error', 'প্রোফাইল ছবি আপডেট করতে সমস্যা হয়েছে।');
  }

  res.redirect('/member/profile');
};
