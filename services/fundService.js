const { Op } = require('sequelize');
const { Member, Deposit, Due, Investment, Profit, ProfitDistribution, Transaction, sequelize } = require('../models');

const toNumber = value => Number(value || 0);

async function getFundStats() {
  const now = new Date();
  const [
    members,
    totalShares,
    totalDeposit,
    totalDue,
    totalInvestment,
    totalProfit,
    currentDeposit,
    currentDue
  ] = await Promise.all([
    Member.count({ where: { status: 'active' } }),
    Member.sum('shares', { where: { status: 'active' } }).then(val => val || 0),
    Deposit.sum('amount').then(val => val || 0),
    Due.sum('totalDue', {
      where: {
        id: {
          [Op.in]: sequelize.literal('(SELECT MAX(id) FROM dues GROUP BY memberId)')
        }
      }
    }).then(val => val || 0),
    Investment.sum('amount', { where: { status: 'active' } }).then(val => val || 0),
    Profit.sum('amount').then(val => val || 0),
    Deposit.sum('amount', { where: { month: now.getMonth() + 1, year: now.getFullYear() } }).then(val => val || 0),
    Due.sum('currentDue', { where: { month: now.getMonth() + 1, year: now.getFullYear() } }).then(val => val || 0)
  ]);

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
