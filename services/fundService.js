const { Op } = require('sequelize');
const { Member, Deposit, Due, Investment, Profit, ProfitDistribution, Transaction, sequelize } = require('../models');

const toNumber = value => Number(value || 0);

async function getFundStats() {
  const members = await Member.count({ where: { status: 'active' } });
  const totalShares = await Member.sum('shares', { where: { status: 'active' } }) || 0;
  const totalDeposit = await Deposit.sum('amount') || 0;
  const totalDue = await Due.sum('totalDue', {
    where: {
      id: {
        [Op.in]: sequelize.literal('(SELECT MAX(id) FROM dues GROUP BY memberId)')
      }
    }
  }) || 0;
  const totalInvestment = await Investment.sum('amount', { where: { status: 'active' } }) || 0;
  const totalProfit = await Profit.sum('amount') || 0;
  const now = new Date();
  const currentDeposit = await Deposit.sum('amount', { where: { month: now.getMonth() + 1, year: now.getFullYear() } }) || 0;
  const currentDue = await Due.sum('currentDue', { where: { month: now.getMonth() + 1, year: now.getFullYear() } }) || 0;
  return {
    members,
    totalShares,
    totalFund: toNumber(totalDeposit) + toNumber(totalProfit) - toNumber(totalInvestment),
    totalDeposit,
    totalDue,
    totalInvestment,
    totalProfit,
    currentDeposit,
    currentDue
  };
}

async function distributeProfit(profit) {
  const members = await Member.findAll({ where: { status: 'active' } });
  const totalShares = members.reduce((sum, member) => sum + Number(member.shares || 0), 0);
  if (!totalShares) return;
  await Promise.all(members.map(member => ProfitDistribution.create({
    profitId: profit.id,
    memberId: member.id,
    shares: member.shares,
    amount: ((Number(profit.amount) * Number(member.shares)) / totalShares).toFixed(2)
  })));
}

async function currentBalance(memberId) {
  const rows = await Transaction.findAll({ where: { memberId }, order: [['transactionDate', 'ASC'], ['id', 'ASC']] });
  return rows.reduce((balance, row) => balance + toNumber(row.credit) - toNumber(row.debit), 0);
}

module.exports = { getFundStats, distributeProfit, currentBalance };
