module.exports = (sequelize, DataTypes) => sequelize.define('Notification', {
  userId: DataTypes.INTEGER,
  title: { type: DataTypes.STRING, allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'notifications' });
