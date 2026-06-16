const { sequelize, User } = require('../models');

async function resetAdmin() {
  try {
    await sequelize.authenticate();
    console.log('Database connected. Resetting admin user...');

    const user = await User.findOne({ where: { email: 'admin@bondhu.test' } });
    if (user) {
      user.password = '12345678';
      await user.save();
      console.log('Existing admin password has been force-reset to: 12345678');
    } else {
      await User.create({
        name: 'অ্যাডমিন',
        email: 'admin@bondhu.test',
        mobile: '01700000000',
        password: '12345678',
        role: 'admin'
      });
      console.log('New admin user created successfully with password: 12345678');
    }
  } catch (error) {
    console.error('Reset admin error:', error);
  } finally {
    await sequelize.close();
  }
}

resetAdmin();
