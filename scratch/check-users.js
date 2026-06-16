const { sequelize, User } = require('../models');

async function checkUsers() {
  try {
    await sequelize.authenticate();
    console.log('Successfully connected to database. Querying users...');

    const users = await User.findAll();
    console.log(`Found ${users.length} users in database:`);
    
    users.forEach(u => {
      console.log({
        id: u.id,
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        role: u.role,
        isActive: u.isActive,
        passwordHash: u.password ? u.password.substring(0, 20) + '...' : 'NULL'
      });
    });
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await sequelize.close();
  }
}

checkUsers();
