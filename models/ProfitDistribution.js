module.exports = (sequelize, DataTypes) => sequelize.define('ProfitDistribution', {
  profitId: { type: DataTypes.INTEGER, allowNull: false },
  memberId: { type: DataTypes.INTEGER, allowNull: false },
  shares: { type: DataTypes.INTEGER, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false }
}, { tableName: 'profit_distributions' });
