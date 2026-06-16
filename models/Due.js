module.exports = (sequelize, DataTypes) => sequelize.define('Due', {
  memberId: { type: DataTypes.INTEGER, allowNull: false },
  month: { type: DataTypes.INTEGER, allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },
  currentDue: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  previousDue: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  totalDue: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('paid', 'partial', 'due'), defaultValue: 'due' }
}, { tableName: 'dues' });
