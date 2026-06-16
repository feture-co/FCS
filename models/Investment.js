module.exports = (sequelize, DataTypes) => sequelize.define('Investment', {
  title: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.ENUM('ব্যবসা', 'FDR', 'স্টক', 'ঋণ', 'অন্যান্য'), allowNull: false },
  investmentDate: { type: DataTypes.DATEONLY, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  description: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('active', 'closed'), defaultValue: 'active' }
}, { tableName: 'investments' });
