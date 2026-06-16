const xss = require('xss');
const { Op } = require('sequelize');
const fs = require('fs').promises;
const cloudinaryService = require('../services/cloudinaryService');
const { User, Member, Deposit, DepositRequest, Due, Investment, Profit, ProfitDistribution, Notice, Transaction, Setting, sequelize } = require('../models');
const { getFundStats, distributeProfit } = require('../services/fundService');
const { sendPush } = require('../services/pushService');
const { generateMonthlyDues, regenerateDuesFrom } = require('../jobs/dueCron');
const { sendDueReminder, sendDueRemindersToAll } = require('../services/reminderService');

exports.dashboard = async (req, res) => {
  const [stats, deposits, investments, profits, recentTransactions] = await Promise.all([
    getFundStats(),
    Deposit.findAll({ limit: 12, order: [['year', 'ASC'], ['month', 'ASC']] }),
    Investment.findAll({ limit: 12, order: [['investmentDate', 'ASC']] }),
    Profit.findAll({ limit: 12, order: [['profitDate', 'ASC']] }),
    Transaction.findAll({
      limit: 6,
      include: Member,
      order: [['transactionDate', 'DESC'], ['id', 'DESC']]
    })
  ]);
  res.render('admin/dashboard', { title: 'অ্যাডমিন ড্যাশবোর্ড', stats, deposits, investments, profits, recentTransactions });
};

exports.members = async (req, res) => {
  const members = await Member.findAll({
    attributes: {
      include: [
        [
          sequelize.literal(`(
            SELECT COALESCE(SUM(amount), 0)
            FROM deposits AS d
            WHERE d.memberId = Member.id
          )`),
          'totalDeposit'
        ],
        [
          sequelize.literal(`(
            SELECT COALESCE(du.totalDue, 0)
            FROM dues AS du
            WHERE du.memberId = Member.id
            ORDER BY du.year DESC, du.month DESC
            LIMIT 1
          )`),
          'totalDue'
        ]
      ]
    },
    order: [['id', 'DESC']]
  });
  res.render('admin/members', { title: 'সদস্য ব্যবস্থাপনা', members });
};

exports.storeMember = async (req, res) => {
  const body = req.body;
  const user = await User.create({ name: body.name, email: body.email, mobile: body.mobile, password: body.password || '12345678', role: 'member' });
  
  let photoValue = null;
  if (req.file) {
    const cloudinaryUrl = await cloudinaryService.uploadImage(req.file.path, 'avatar');
    if (cloudinaryUrl) {
      photoValue = cloudinaryUrl;
      await fs.unlink(req.file.path).catch(err => console.error('Error deleting temp file:', err));
    } else {
      photoValue = req.file.filename;
    }
  }

  await Member.create({
    userId: user.id,
    name: xss(body.name),
    mobile: xss(body.mobile),
    email: body.email,
    address: xss(body.address || ''),
    joinDate: body.joinDate,
    monthlyDeposit: body.monthlyDeposit,
    shares: body.shares,
    photo: photoValue,
    status: body.status || 'active'
  });
  req.flash('success', 'সদস্য যোগ হয়েছে।');
  res.redirect('/admin/members');
};

exports.updateMember = async (req, res) => {
  const member = await Member.findByPk(req.params.id);
  if (!member) return res.redirect('/admin/members');

  let photoValue = member.photo;
  if (req.file) {
    const cloudinaryUrl = await cloudinaryService.uploadImage(req.file.path, 'avatar');
    if (cloudinaryUrl) {
      photoValue = cloudinaryUrl;
      await fs.unlink(req.file.path).catch(err => console.error('Error deleting temp file:', err));
    } else {
      photoValue = req.file.filename;
    }
  }

  await member.update({ ...req.body, photo: photoValue });
  if (member.userId) {
    await User.update(
      { name: req.body.name, email: req.body.email, mobile: req.body.mobile },
      { where: { id: member.userId } }
    );
  }
  req.flash('success', 'সদস্য আপডেট হয়েছে।');
  res.redirect('/admin/members');
};

exports.deleteMember = async (req, res) => {
  await Member.destroy({ where: { id: req.params.id } });
  req.flash('success', 'সদস্য ডিলিট হয়েছে।');
  res.redirect('/admin/members');
};

exports.setMemberStatus = async (req, res) => {
  await Member.update({ status: req.body.status }, { where: { id: req.params.id } });
  req.flash('success', 'সদস্যের স্ট্যাটাস পরিবর্তন হয়েছে।');
  res.redirect('/admin/members');
};

exports.admins = async (req, res) => {
  const admins = await User.findAll({
    where: { role: 'admin' },
    order: [['id', 'DESC']]
  });
  res.render('admin/admins', { title: 'অ্যাডমিন ব্যবস্থাপনা', admins });
};

exports.storeAdmin = async (req, res) => {
  const body = req.body;
  try {
    await User.create({
      name: xss(body.name),
      email: body.email,
      mobile: xss(body.mobile),
      password: body.password || '12345678',
      role: 'admin'
    });
    req.flash('success', 'নতুন অ্যাডমিন যোগ হয়েছে।');
  } catch (error) {
    req.flash('error', 'অ্যাডমিন যোগ করা যায়নি। সম্ভবত এই ইমেইলটি ইতিপূর্বে ব্যবহার করা হয়েছে।');
  }
  res.redirect('/admin/admins');
};

exports.updateAdmin = async (req, res) => {
  const admin = await User.findOne({ where: { id: req.params.id, role: 'admin' } });
  if (!admin) return res.redirect('/admin/admins');
  
  const updateData = {
    name: xss(req.body.name),
    email: req.body.email,
    mobile: xss(req.body.mobile)
  };
  if (req.body.password) {
    updateData.password = req.body.password;
  }
  try {
    await admin.update(updateData);
    req.flash('success', 'অ্যাডমিন তথ্য আপডেট হয়েছে।');
  } catch (error) {
    req.flash('error', 'অ্যাডমিন তথ্য আপডেট করা যায়নি।');
  }
  res.redirect('/admin/admins');
};

exports.deleteAdmin = async (req, res) => {
  if (Number(req.params.id) === Number(req.user.id)) {
    req.flash('error', 'আপনি নিজেকে মুছে ফেলতে পারবেন না!');
    return res.redirect('/admin/admins');
  }
  await User.destroy({ where: { id: req.params.id, role: 'admin' } });
  req.flash('success', 'অ্যাডমিন মুছে ফেলা হয়েছে।');
  res.redirect('/admin/admins');
};

exports.deposits = async (req, res) => {
  const [deposits, members, totalDeposit, thisMonthDeposit, overdueCount, pendingRequests] = await Promise.all([
    Deposit.findAll({ include: Member, order: [['depositDate', 'DESC']] }),
    Member.findAll({ where: { status: 'active' } }),
    Deposit.sum('amount') || 0,
    Deposit.sum('amount', {
      where: {
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      }
    }) || 0,
    Due.count({
      distinct: true,
      col: 'memberId',
      where: { status: { [Op.ne]: 'paid' } }
    }),
    DepositRequest.findAll({
      where: { status: 'pending' },
      include: Member,
      order: [['createdAt', 'DESC']]
    })
  ]);
  res.render('admin/deposits', { 
    title: 'জমা ব্যবস্থাপনা', 
    deposits, 
    members, 
    pendingRequests,
    stats: { totalDeposit, thisMonthDeposit, overdueCount } 
  });
};

exports.storeDeposit = async (req, res) => {
  const member = await Member.findByPk(req.body.memberId);
  const amount = Number(req.body.amount);
  const status = amount >= Number(member.monthlyDeposit) ? 'paid' : amount > 0 ? 'partial' : 'due';
  const deposit = await Deposit.create({ ...req.body, status });
  await Transaction.create({ memberId: member.id, type: 'জমা', credit: amount, transactionDate: deposit.depositDate, description: deposit.note });
  await regenerateDuesFrom(new Date(Number(req.body.year), Number(req.body.month) - 1, 1));
  req.flash('success', 'জমা এন্ট্রি সম্পন্ন হয়েছে।');
  res.redirect('/admin/deposits');
};

exports.updateDeposit = async (req, res) => {
  const deposit = await Deposit.findByPk(req.params.id);
  if (!deposit) return res.redirect('/admin/deposits');

  const oldAmount = deposit.amount;
  const oldDepositDate = deposit.depositDate;
  const oldMemberId = deposit.memberId;

  const member = await Member.findByPk(req.body.memberId);
  const amount = Number(req.body.amount);
  const status = amount >= Number(member.monthlyDeposit) ? 'paid' : amount > 0 ? 'partial' : 'due';

  await deposit.update({
    memberId: req.body.memberId,
    month: req.body.month,
    year: req.body.year,
    amount: amount,
    depositDate: req.body.depositDate,
    note: req.body.note,
    status: status
  });

  // Find corresponding transaction and update it
  const transaction = await Transaction.findOne({
    where: {
      memberId: oldMemberId,
      type: 'জমা',
      transactionDate: oldDepositDate,
      credit: oldAmount
    }
  });

  if (transaction) {
    await transaction.update({
      memberId: member.id,
      credit: amount,
      transactionDate: deposit.depositDate,
      description: deposit.note
    });
  } else {
    await Transaction.create({
      memberId: member.id,
      type: 'জমা',
      credit: amount,
      transactionDate: deposit.depositDate,
      description: deposit.note
    });
  }

  await regenerateDuesFrom(new Date(Number(req.body.year), Number(req.body.month) - 1, 1));
  
  req.flash('success', 'জমা আপডেট সম্পন্ন হয়েছে।');
  req.session.save(() => {
    res.redirect('/admin/deposits');
  });
};

exports.dues = async (req, res) => {
  const [dues, totalDue, overdueCount, currentDue, settingsList] = await Promise.all([
    Due.findAll({
      where: {
        id: {
          [Op.in]: sequelize.literal('(SELECT MAX(id) FROM dues GROUP BY memberId)')
        }
      },
      include: Member,
      order: [['year', 'DESC'], ['month', 'DESC']]
    }),
    Due.sum('totalDue', {
      where: {
        id: {
          [Op.in]: sequelize.literal('(SELECT MAX(id) FROM dues GROUP BY memberId)')
        }
      }
    }) || 0,
    Due.count({
      distinct: true,
      col: 'memberId',
      where: { status: { [Op.ne]: 'paid' } }
    }) || 0,
    Due.sum('currentDue', {
      where: {
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      }
    }) || 0,
    Setting.findAll()
  ]);

  const smtp = {};
  settingsList.forEach(s => {
    smtp[s.key] = s.value;
  });

  res.render('admin/dues', { 
    title: 'বকেয়া ব্যবস্থাপনা', 
    dues, 
    stats: { totalDue, overdueCount, currentDue },
    smtp
  });
};

exports.investments = async (req, res) => {
  const [investments, totalInvestment, activeInvestment, closedInvestment] = await Promise.all([
    Investment.findAll({
      include: Profit,
      order: [['investmentDate', 'DESC']]
    }),
    Investment.sum('amount') || 0,
    Investment.sum('amount', { where: { status: 'active' } }) || 0,
    Investment.sum('amount', { where: { status: 'closed' } }) || 0
  ]);
  res.render('admin/investments', { 
    title: 'বিনিয়োগ', 
    investments,
    stats: { totalInvestment, activeInvestment, closedInvestment }
  });
};

exports.storeInvestment = async (req, res) => {
  const investment = await Investment.create(req.body);
  await Transaction.create({ type: 'বিনিয়োগ', debit: investment.amount, transactionDate: investment.investmentDate, description: investment.title });
  await sendPush('নতুন বিনিয়োগ', `${investment.title} বিনিয়োগ যোগ হয়েছে।`, 'investment');
  req.flash('success', 'বিনিয়োগ যোগ হয়েছে।');
  res.redirect('/admin/investments');
};

exports.updateInvestment = async (req, res) => {
  const investment = await Investment.findByPk(req.params.id);
  if (!investment) return res.redirect('/admin/investments');

  const oldAmount = investment.amount;
  const oldDate = investment.investmentDate;
  const oldTitle = investment.title;

  await investment.update(req.body);

  if (req.body.title !== undefined || req.body.amount !== undefined || req.body.investmentDate !== undefined) {
    const transaction = await Transaction.findOne({
      where: {
        type: 'বিনিয়োগ',
        debit: oldAmount,
        transactionDate: oldDate,
        description: oldTitle
      }
    });
    if (transaction) {
      await transaction.update({
        debit: investment.amount,
        transactionDate: investment.investmentDate,
        description: investment.title
      });
    }
  }

  req.flash('success', 'বিনিয়োগ আপডেট হয়েছে।');
  res.redirect('/admin/investments');
};

exports.deleteInvestment = async (req, res) => {
  const investment = await Investment.findByPk(req.params.id);
  if (!investment) return res.redirect('/admin/investments');

  // Find and delete corresponding investment transaction
  await Transaction.destroy({
    where: {
      type: 'বিনিয়োগ',
      debit: investment.amount,
      transactionDate: investment.investmentDate,
      description: investment.title
    }
  });

  // Find associated profits
  const profits = await Profit.findAll({ where: { investmentId: investment.id } });
  for (const profit of profits) {
    // Delete distributions
    await ProfitDistribution.destroy({ where: { profitId: profit.id } });
    // Delete transaction for profit
    await Transaction.destroy({
      where: {
        type: 'লাভ',
        credit: profit.amount,
        transactionDate: profit.profitDate,
        description: profit.description
      }
    });
    // Delete profit
    await profit.destroy();
  }

  // Delete investment
  await investment.destroy();

  req.flash('success', 'বিনিয়োগ এবং এর সাথে সম্পর্কিত লাভ ও ট্রানজেকশন মুছে ফেলা হয়েছে।');
  res.redirect('/admin/investments');
};

exports.profits = async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [profits, investments, totalProfit, thisMonthProfit, distributedProfit] = await Promise.all([
    Profit.findAll({ include: Investment, order: [['profitDate', 'DESC']] }),
    Investment.findAll(),
    Profit.sum('amount') || 0,
    Profit.sum('amount', {
      where: {
        profitDate: {
          [Op.between]: [
            startOfMonth.toISOString().substring(0, 10),
            endOfMonth.toISOString().substring(0, 10)
          ]
        }
      }
    }) || 0,
    ProfitDistribution.sum('amount') || 0
  ]);
  res.render('admin/profits', { 
    title: 'লাভ', 
    profits, 
    investments, 
    stats: { totalProfit, thisMonthProfit, distributedProfit } 
  });
};

exports.storeProfit = async (req, res) => {
  const profit = await Profit.create(req.body);
  await distributeProfit(profit);
  await Transaction.create({ type: 'লাভ', credit: profit.amount, transactionDate: profit.profitDate, description: profit.description });
  await sendPush('লাভ যোগ হয়েছে', `${profit.amount} টাকা লাভ যোগ হয়েছে।`, 'profit');
  req.flash('success', 'লাভ যোগ ও শেয়ারভিত্তিক বণ্টন হয়েছে।');
  res.redirect('/admin/profits');
};

exports.profitShare = async (req, res) => {
  const [members, totalEarnedProfit, totalShares, activeMembersCount] = await Promise.all([
    Member.findAll({
      where: { status: 'active' },
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COALESCE(SUM(amount), 0)
              FROM profit_distributions AS pd
              WHERE pd.memberId = Member.id
            )`),
            'totalProfitShare'
          ]
        ]
      },
      order: [['id', 'DESC']]
    }),
    Profit.sum('amount') || 0,
    Member.sum('shares', { where: { status: 'active' } }) || 0,
    Member.count({ where: { status: 'active' } })
  ]);

  res.render('admin/profit_share', {
    title: 'লভ্যাংশ বণ্টন',
    members,
    stats: { totalEarnedProfit, totalShares, activeMembersCount }
  });
};

exports.notices = async (req, res) => {
  const notices = await Notice.findAll({ order: [['publishDate', 'DESC']] });
  res.render('admin/notices', { title: 'নোটিশ', notices });
};

exports.storeNotice = async (req, res) => {
  const notice = await Notice.create({ title: xss(req.body.title), description: xss(req.body.description), publishDate: req.body.publishDate, createdBy: req.user.id });
  await sendPush('নতুন নোটিশ', notice.title, 'notice');
  req.flash('success', 'নোটিশ প্রকাশ হয়েছে।');
  res.redirect('/admin/notices');
};

exports.approveDepositRequest = async (req, res) => {
  try {
    const request = await DepositRequest.findByPk(req.params.id, { include: Member });
    if (!request) {
      req.flash('error', 'জমা অনুরোধ পাওয়া যায়নি।');
      return res.redirect('/admin/deposits');
    }
    
    if (request.status !== 'pending') {
      req.flash('error', 'এই অনুরোধটি ইতিমধ্যে প্রক্রিয়াজাত করা হয়েছে।');
      return res.redirect('/admin/deposits');
    }

    const amount = Number(request.amount);
    const monthlyDeposit = Number(request.Member ? request.Member.monthlyDeposit : 0);
    const status = amount >= monthlyDeposit ? 'paid' : amount > 0 ? 'partial' : 'due';

    // Create deposit
    await Deposit.create({
      memberId: request.memberId,
      month: request.month,
      year: request.year,
      amount: request.amount,
      depositDate: request.depositDate,
      note: request.note,
      status: status
    });

    // Create transaction
    await Transaction.create({
      memberId: request.memberId,
      type: 'জমা',
      credit: request.amount,
      transactionDate: request.depositDate,
      description: request.note ? `জমা অনুরোধ (#DR-${request.id}) অনুমোদন: ${request.note}` : `জমা অনুরোধ (#DR-${request.id}) অনুমোদন`
    });

    // Update request
    await request.update({
      status: 'approved',
      adminNote: req.body.adminNote || 'অনুমোদিত',
      approvedBy: req.user.id,
      approvedAt: new Date()
    });

    // Regenerate dues
    await regenerateDuesFrom(new Date(Number(request.year), Number(request.month) - 1, 1));

    req.flash('success', 'জমা অনুরোধ সফলভাবে অনুমোদন করা হয়েছে।');
  } catch (error) {
    console.error(error);
    req.flash('error', 'অনুরোধ অনুমোদন করার সময় কোনো সমস্যা হয়েছে।');
  }
  res.redirect('/admin/deposits');
};

exports.rejectDepositRequest = async (req, res) => {
  try {
    const request = await DepositRequest.findByPk(req.params.id);
    if (!request) {
      req.flash('error', 'জমা অনুরোধ পাওয়া যায়নি।');
      return res.redirect('/admin/deposits');
    }

    if (request.status !== 'pending') {
      req.flash('error', 'এই অনুরোধটি ইতিমধ্যে প্রক্রিয়াজাত করা হয়েছে।');
      return res.redirect('/admin/deposits');
    }

    // Update request
    await request.update({
      status: 'rejected',
      adminNote: req.body.adminNote || 'প্রত্যাখ্যাত',
      approvedBy: req.user.id,
      approvedAt: new Date()
    });

    req.flash('success', 'জমা অনুরোধ সফলভাবে প্রত্যাখ্যান করা হয়েছে।');
  } catch (error) {
    console.error(error);
    req.flash('error', 'অনুরোধ প্রত্যাখ্যান করার সময় কোনো সমস্যা হয়েছে।');
  }
  res.redirect('/admin/deposits');
};

exports.updateSMTPConfig = async (req, res) => {
  try {
    const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, smtp_from_email, smtp_from_name } = req.body;
    
    // Save setting key-values helper
    const saveSetting = async (key, val) => {
      const [setting] = await Setting.findOrCreate({ where: { key } });
      await setting.update({ value: val || '' });
    };

    await Promise.all([
      saveSetting('smtp_host', smtp_host),
      saveSetting('smtp_port', smtp_port),
      saveSetting('smtp_user', smtp_user),
      saveSetting('smtp_pass', smtp_pass),
      saveSetting('smtp_secure', smtp_secure === 'true' ? 'true' : 'false'),
      saveSetting('smtp_from_email', smtp_from_email),
      saveSetting('smtp_from_name', smtp_from_name)
    ]);

    req.flash('success', 'SMTP কনফিগারেশন সফলভাবে আপডেট করা হয়েছে।');
    res.redirect('/admin/dues');
  } catch (error) {
    console.error('SMTP configuration error:', error);
    req.flash('error', 'SMTP কনফিগারেশন আপডেট করা যায়নি।');
    res.redirect('/admin/dues');
  }
};

exports.sendBulkReminders = async (req, res) => {
  try {
    const report = await sendDueRemindersToAll();
    return res.json({
      success: true,
      message: `রিমাইন্ডার পাঠানো সম্পন্ন হয়েছে। মোট সদস্য: ${report.eligible} জন, সফল: ${report.sent} জন, ব্যর্থ: ${report.failed} জন।`,
      report
    });
  } catch (error) {
    console.error('Error in sendBulkReminders:', error);
    return res.status(500).json({ success: false, error: 'সার্ভার ত্রুটি, রিমাইন্ডার পাঠানো যায়নি।' });
  }
};

exports.sendIndividualReminder = async (req, res) => {
  try {
    const memberId = req.params.memberId;
    const result = await sendDueReminder(memberId);
    if (result.success) {
      return res.json({ success: true, message: 'সদস্যকে রিমাইন্ডার সফলভাবে পাঠানো হয়েছে।' });
    } else {
      return res.status(400).json({ success: false, error: result.error || 'ইমেইল পাঠানো ব্যর্থ হয়েছে।' });
    }
  } catch (error) {
    console.error(`Error in sendIndividualReminder for member ${req.params.memberId}:`, error);
    return res.status(500).json({ success: false, error: 'সার্ভার ত্রুটি, রিমাইন্ডার পাঠানো যায়নি।' });
  }
};
