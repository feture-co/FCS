const cron = require('node-cron');
const { Op } = require('sequelize');
const { Member, Deposit, Due } = require('../models');
const { sendPush } = require('../services/pushService');
const { sendDueRemindersToAll } = require('../services/reminderService');

async function generateMonthlyDues(date = new Date(), notify = true) {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const members = await Member.findAll({ where: { status: 'active' } });
  
  for (const member of members) {
    const latestDeposit = await Deposit.findOne({
      where: {
        memberId: member.id,
        depositDate: {
          [Op.lt]: new Date(year, month, 1)
        }
      },
      order: [['depositDate', 'DESC']]
    });

    const monthlyDeposit = Number(member.monthlyDeposit);
    let totalDue = 0;
    let previousDue = 0;

    if (latestDeposit) {
      const dDate = new Date(latestDeposit.depositDate);
      const latestMonth = dDate.getMonth() + 1;
      const latestYear = dDate.getFullYear();

      const startOfLatestMonth = new Date(latestYear, latestMonth - 1, 1);
      const endOfLatestMonth = new Date(latestYear, latestMonth, 0, 23, 59, 59, 999);
      const latestAmount = await Deposit.sum('amount', {
        where: {
          memberId: member.id,
          depositDate: {
            [Op.between]: [startOfLatestMonth, endOfLatestMonth]
          }
        }
      }) || 0;

      const shortfall = Math.max(monthlyDeposit - Number(latestAmount), 0);
      
      const elapsed = (year - latestYear) * 12 + (month - latestMonth);
      totalDue = Math.max(elapsed * monthlyDeposit + shortfall, 0);
      previousDue = Math.max((elapsed - 1) * monthlyDeposit + shortfall, 0);
    } else {
      const joinDate = new Date(member.joinDate);
      const joinYear = joinDate.getFullYear();
      const joinMonth = joinDate.getMonth() + 1;
      
      const elapsed = (year - joinYear) * 12 + (month - joinMonth);
      if (elapsed > 0) {
        totalDue = elapsed * monthlyDeposit;
        previousDue = (elapsed - 1) * monthlyDeposit;
      }
    }

    const currentDue = Math.max(totalDue - previousDue, 0);
    const status = totalDue > 0 ? (currentDue > 0 ? 'due' : 'partial') : 'paid';

    const [due] = await Due.findOrCreate({ where: { memberId: member.id, month, year } });
    await due.update({ previousDue, currentDue, totalDue, status });
  }
  if (notify) await sendPush('মাসিক জমার রিমাইন্ডার', 'এই মাসের জমা ও বকেয়া আপডেট করা হয়েছে।', 'monthly_due');
}

async function regenerateDuesFrom(startDate = new Date(), notify = true) {
  const start = new Date(startDate);
  const end = new Date();
  
  start.setDate(1);
  end.setDate(1);

  if (start > end) {
    await generateMonthlyDues(start, notify);
    return;
  }

  while (start <= end) {
    const isLastMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    await generateMonthlyDues(new Date(start), notify && isLastMonth);
    start.setMonth(start.getMonth() + 1);
  }
}

function startDueCron() {
  // Generate monthly dues at 00:05 on the 1st of every month
  cron.schedule('5 0 1 * *', () => generateMonthlyDues().catch(console.error), { timezone: 'Asia/Dhaka' });

  // Send weekly due reminder emails at 09:00 AM every Sunday
  cron.schedule('0 9 * * 0', () => {
    console.log('Automated weekly due reminder cron triggered.');
    sendDueRemindersToAll().catch(console.error);
  }, { timezone: 'Asia/Dhaka' });
}

module.exports = { generateMonthlyDues, regenerateDuesFrom, startDueCron };
