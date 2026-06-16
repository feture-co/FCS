module.exports = (sequelize, DataTypes) => sequelize.define('AuditLog', {
  userId: DataTypes.INTEGER,
  action: { type: DataTypes.STRING, allowNull: false },
  entity: DataTypes.STRING,
  entityId: DataTypes.INTEGER,
  ipAddress: DataTypes.STRING,
  metadata: DataTypes.JSON
}, { tableName: 'audit_logs' });
