require('dotenv').config();

const { sequelize, User, Member } = require('./models');

(async () => {
  await sequelize.sync();
  const [admin] = await User.findOrCreate({
    where: { email: 'admin@bondhu.test' },
    defaults: { name: 'অ্যাডমিন', email: 'admin@bondhu.test', mobile: '01700000000', password: '12345678', role: 'admin' }
  });
  const [memberUser] = await User.findOrCreate({
    where: { email: 'member@bondhu.test' },
    defaults: { name: 'সদস্য এক', email: 'member@bondhu.test', mobile: '01800000000', password: '12345678', role: 'member' }
  });
  await Member.findOrCreate({
    where: { userId: memberUser.id },
    defaults: {
      userId: memberUser.id,
      name: 'সদস্য এক',
      mobile: '01800000000',
      email: 'member@bondhu.test',
      address: 'ঢাকা',
      joinDate: new Date(),
      monthlyDeposit: 1000,
      shares: 3,
      status: 'active'
    }
  });
  console.log(`Seed complete. Admin: ${admin.email} / 12345678, Member: member@bondhu.test / 12345678`);
  process.exit(0);
})();
