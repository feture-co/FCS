const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models');

async function testLogin() {
  try {
    const email = 'admin@bondhu.test';
    const password = '12345678';
    
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('User not found in Aiven database.');
      return;
    }
    console.log(`User found. Name: ${user.name}, Email: ${user.email}, Role: ${user.role}, IsActive: ${user.isActive}`);
    
    const matches = await bcrypt.compare(password, user.password);
    console.log(`Bcrypt verification of password "12345678": ${matches ? 'SUCCESS' : 'FAILED'}`);
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await sequelize.close();
  }
}

testLogin();
