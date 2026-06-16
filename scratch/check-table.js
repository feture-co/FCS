const { sequelize } = require('../models');

async function checkTable() {
  try {
    const [results] = await sequelize.query('DESCRIBE users;');
    console.log('Table schema for users:');
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Error describing table:', error);
  } finally {
    await sequelize.close();
  }
}

checkTable();
