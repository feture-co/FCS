module.exports = (sequelize, DataTypes) => sequelize.define('Deposit', {
  memberId: { type: DataTypes.INTEGER, allowNull: false },
  month: { type: DataTypes.INTEGER, allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  depositDate: { type: DataTypes.DATEONLY, allowNull: false },
  note: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('paid', 'partial', 'due'), defaultValue: 'paid' }
}, { tableName: 'deposits' });
