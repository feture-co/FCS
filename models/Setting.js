module.exports = (sequelize, DataTypes) => sequelize.define('Setting', {
  key: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
  value: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'settings' });
