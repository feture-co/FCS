module.exports = (sequelize, DataTypes) => sequelize.define('Profit', {
  investmentId: { type: DataTypes.INTEGER, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  profitDate: { type: DataTypes.DATEONLY, allowNull: false },
  description: DataTypes.TEXT
}, { tableName: 'profits' });
