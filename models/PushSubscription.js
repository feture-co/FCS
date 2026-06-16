module.exports = (sequelize, DataTypes) => sequelize.define('PushSubscription', {
  userId: DataTypes.INTEGER,
  endpoint: { type: DataTypes.TEXT, allowNull: false },
  p256dh: { type: DataTypes.TEXT, allowNull: false },
  auth: { type: DataTypes.TEXT, allowNull: false }
}, { tableName: 'push_subscriptions' });
