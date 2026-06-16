const { sequelize, Member, Due } = require('../models');
const { getDueBreakdown } = require('../services/reminderService');

async function runTest() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // Fetch an active member
    const member = await Member.findOne({ where: { status: 'active' } });
    if (!member) {
      console.log('No active member found.');
      return;
    }
    console.log(`Testing with Member: ${member.name} (ID: ${member.id}, Monthly Deposit: ${member.monthlyDeposit})`);

    // Fetch their latest due record
    const latestDue = await Due.findOne({
      where: { memberId: member.id },
      order: [['year', 'DESC'], ['month', 'DESC']]
    });

    if (!latestDue) {
      console.log('No due record found for this member.');
      return;
    }
    console.log(`Latest Due record: Month=${latestDue.month}, Year=${latestDue.year}, TotalDue=${latestDue.totalDue}, Status=${latestDue.status}`);

    const breakdown = getDueBreakdown(member, latestDue);
    console.log('Computed Due Breakdown:');
    console.log(JSON.stringify(breakdown, null, 2));

    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    await sequelize.close();
  }
}

runTest();
