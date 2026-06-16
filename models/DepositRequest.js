module.exports = (sequelize, DataTypes) => sequelize.define('DepositRequest', {
  memberId: { type: DataTypes.INTEGER, allowNull: false },
  month: { type: DataTypes.INTEGER, allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  depositDate: { type: DataTypes.DATEONLY, allowNull: false },
  note: DataTypes.TEXT,
  receipt: DataTypes.STRING,
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
  adminNote: DataTypes.TEXT,
  approvedBy: DataTypes.INTEGER,
  approvedAt: DataTypes.DATE
}, { tableName: 'deposit_requests' });
