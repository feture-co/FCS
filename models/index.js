const { Sequelize, DataTypes } = require('sequelize');
const db = require('../config/database');

const sequelize = new Sequelize(db.database, db.username, db.password, db);

const User = require('./User')(sequelize, DataTypes);
const Member = require('./Member')(sequelize, DataTypes);
const Deposit = require('./Deposit')(sequelize, DataTypes);
const DepositRequest = require('./DepositRequest')(sequelize, DataTypes);
const Due = require('./Due')(sequelize, DataTypes);
const Investment = require('./Investment')(sequelize, DataTypes);
const Profit = require('./Profit')(sequelize, DataTypes);
const ProfitDistribution = require('./ProfitDistribution')(sequelize, DataTypes);
const Transaction = require('./Transaction')(sequelize, DataTypes);
const Notice = require('./Notice')(sequelize, DataTypes);
const Notification = require('./Notification')(sequelize, DataTypes);
const AuditLog = require('./AuditLog')(sequelize, DataTypes);
const PushSubscription = require('./PushSubscription')(sequelize, DataTypes);
const Setting = require('./Setting')(sequelize, DataTypes);

User.hasOne(Member, { foreignKey: 'userId' });
Member.belongsTo(User, { foreignKey: 'userId' });
Member.hasMany(Deposit, { foreignKey: 'memberId' });
Deposit.belongsTo(Member, { foreignKey: 'memberId' });
Member.hasMany(DepositRequest, { foreignKey: 'memberId' });
DepositRequest.belongsTo(Member, { foreignKey: 'memberId' });
Member.hasMany(Due, { foreignKey: 'memberId' });
Due.belongsTo(Member, { foreignKey: 'memberId' });
Investment.hasMany(Profit, { foreignKey: 'investmentId' });
Profit.belongsTo(Investment, { foreignKey: 'investmentId' });
Profit.hasMany(ProfitDistribution, { foreignKey: 'profitId' });
ProfitDistribution.belongsTo(Profit, { foreignKey: 'profitId' });
Member.hasMany(ProfitDistribution, { foreignKey: 'memberId' });
ProfitDistribution.belongsTo(Member, { foreignKey: 'memberId' });
Member.hasMany(Transaction, { foreignKey: 'memberId' });
Transaction.belongsTo(Member, { foreignKey: 'memberId' });
User.hasMany(Notice, { foreignKey: 'createdBy' });
Notice.belongsTo(User, { foreignKey: 'createdBy' });
User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(PushSubscription, { foreignKey: 'userId' });
PushSubscription.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  Sequelize,
  User,
  Member,
  Deposit,
  DepositRequest,
  Due,
  Investment,
  Profit,
  ProfitDistribution,
  Transaction,
  Notice,
  Notification,
  AuditLog,
  PushSubscription,
  Setting
};
