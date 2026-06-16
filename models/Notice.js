module.exports = (sequelize, DataTypes) => sequelize.define('Notice', {
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  publishDate: { type: DataTypes.DATEONLY, allowNull: false },
  createdBy: { type: DataTypes.INTEGER, allowNull: false }
}, { tableName: 'notices' });
