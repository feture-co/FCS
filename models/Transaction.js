module.exports = (sequelize, DataTypes) => sequelize.define('Transaction', {
  memberId: DataTypes.INTEGER,
  type: { type: DataTypes.STRING, allowNull: false },
  debit: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  credit: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  balance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  transactionDate: { type: DataTypes.DATEONLY, allowNull: false },
  description: DataTypes.TEXT
}, { tableName: 'transactions' });
