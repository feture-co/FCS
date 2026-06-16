module.exports = (sequelize, DataTypes) => sequelize.define('Member', {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  mobile: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, validate: { isEmail: true } },
  address: DataTypes.TEXT,
  joinDate: { type: DataTypes.DATEONLY, allowNull: false },
  monthlyDeposit: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  shares: { type: DataTypes.INTEGER, defaultValue: 1 },
  photo: DataTypes.STRING,
  status: { type: DataTypes.ENUM('active', 'suspended'), defaultValue: 'active' }
}, { tableName: 'members' });
