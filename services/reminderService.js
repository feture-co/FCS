const { Member, Due, sequelize } = require('../models');
const { sendEmail } = require('./emailService');
const { Op } = require('sequelize');

const BENGALI_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল',
  'মে', 'জুন', 'জুলাই', 'আগস্ট',
  'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const BENGALI_NUMBERS = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
};

function formatBengaliNumber(num) {
  return String(num).replace(/[0-9]/g, d => BENGALI_NUMBERS[d] || d);
}

/**
 * Computes a detailed monthly breakdown of the total due for a member.
 */
function getDueBreakdown(member, latestDue) {
  let remainingDue = Number(latestDue.totalDue);
  const monthlyDeposit = Number(member.monthlyDeposit);
  const dueBreakdown = [];

  let testMonth = latestDue.month;
  let testYear = latestDue.year;

  while (remainingDue > 0) {
    const amountForThisMonth = Math.min(remainingDue, monthlyDeposit);
    dueBreakdown.push({
      month: testMonth,
      year: testYear,
      monthName: BENGALI_MONTHS[testMonth - 1] || `মাস ${testMonth}`,
      amount: amountForThisMonth
    });
    remainingDue -= amountForThisMonth;

    // Go to previous month
    testMonth--;
    if (testMonth < 1) {
      testMonth = 12;
      testYear--;
    }

    if (monthlyDeposit <= 0 || dueBreakdown.length > 36) {
      if (remainingDue > 0) {
        dueBreakdown.push({
          month: null,
          year: null,
          monthName: 'পূর্ববর্তী বকেয়া',
          amount: remainingDue
        });
      }
      break;
    }
  }

  return dueBreakdown.reverse();
}

/**
 * Renders a premium HTML email template for due reminder.
 */
function renderReminderTemplate(memberName, memberId, totalDue, breakdown) {
  const formattedId = `BF-2026-${String(memberId).padStart(3, '0')}`;
  const appName = process.env.APP_NAME || 'বন্ধু ফান্ড ম্যানেজমেন্ট সিস্টেম';

  let breakdownRowsHtml = '';
  breakdown.forEach(item => {
    const period = item.year ? `${item.monthName}, ${formatBengaliNumber(item.year)}` : item.monthName;
    breakdownRowsHtml += `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eef2f5; font-family: 'Noto Sans Bengali', Arial, sans-serif; font-size: 14px; color: #4b5563;">${period}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eef2f5; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #1f2937; text-align: right;">৳${Number(item.amount).toLocaleString('bn-BD')}</td>
      </tr>
    `;
  });

  return `
    <!DOCTYPE html>
    <html lang="bn">
    <head>
      <meta charset="UTF-8">
      <title>মাসিক জমার বকেয়া রিমাইন্ডার</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;700&display=swap');
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Noto Sans Bengali', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 30px 15px;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);">
              
              <!-- Vibrant Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%); padding: 35px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; font-family: 'Noto Sans Bengali', Arial, sans-serif;">${appName}</h1>
                  <p style="color: rgba(255, 255, 255, 0.85); margin: 8px 0 0 0; font-size: 14px; font-family: 'Noto Sans Bengali', Arial, sans-serif;">বকেয়া মাসিক কিস্তি পরিশোধের রিমাইন্ডার</p>
                </td>
              </tr>

              <!-- Content Area -->
              <tr>
                <td style="padding: 40px 30px; background-color: #ffffff;">
                  <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #1f2937; font-weight: 500;">
                    প্রিয় <strong>${memberName}</strong> (আইডি: ${formattedId}),
                  </p>
                  <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #4b5563;">
                    আশা করি ভালো আছেন। ফান্ডের হিসাব অনুযায়ী আপনার মাসিক জমার কিস্তি বকেয়া রয়েছে। বকেয়া পরিশোধ করার জন্য অনুরোধ করা হলো। বিস্তারিত নিচে দেওয়া হলো:
                  </p>

                  <!-- Breakdown Table -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                    <thead>
                      <tr style="background-color: #f8fafc;">
                        <th style="padding: 12px; text-align: left; font-family: 'Noto Sans Bengali', Arial, sans-serif; font-size: 13px; font-weight: bold; color: #6b7280; border-bottom: 2px solid #e5e7eb;">মাস & বছর</th>
                        <th style="padding: 12px; text-align: right; font-family: 'Noto Sans Bengali', Arial, sans-serif; font-size: 13px; font-weight: bold; color: #6b7280; border-bottom: 2px solid #e5e7eb;">বকেয়া পরিমাণ</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${breakdownRowsHtml}
                      <tr style="background-color: #fdf2f2;">
                        <td style="padding: 14px 12px; font-family: 'Noto Sans Bengali', Arial, sans-serif; font-size: 15px; font-weight: bold; color: #b91c1c;">সর্বমোট বকেয়া পরিমাণ</td>
                        <td style="padding: 14px 12px; font-family: Arial, sans-serif; font-size: 16px; font-weight: 900; color: #b91c1c; text-align: right;">৳${Number(totalDue).toLocaleString('bn-BD')}</td>
                      </tr>
                    </tbody>
                  </table>

                  <!-- CTA Button -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 30px; text-align: center;">
                    <tr>
                      <td align="center">
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/member/deposits" style="display: inline-block; padding: 14px 30px; background-color: #0d6efd; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; font-family: 'Noto Sans Bengali', Arial, sans-serif; box-shadow: 0 4px 6px -1px rgba(13, 110, 253, 0.2), 0 2px 4px -1px rgba(13, 110, 253, 0.1);">
                          বকেয়া কিস্তি পরিশোধ করুন
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 30px 0 0 0; font-size: 13px; line-height: 20px; color: #9ca3af; text-align: center;">
                    ইতিমধ্যে পরিশোধ করে থাকলে এই বার্তাটি উপেক্ষা করুন। কোনো জিজ্ঞাসা থাকলে অ্যাডমিনের সাথে যোগাযোগ করুন।
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #f3f4f6;">
                  <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    &copy; ২০২৬ ${appName}। সর্বস্বত্ব সংরক্ষিত।
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Sends due reminder email to a single member by their ID.
 * @param {number} memberId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendDueReminder(memberId) {
  try {
    const member = await Member.findByPk(memberId);
    if (!member || member.status !== 'active') {
      return { success: false, error: 'সদস্য খুঁজে পাওয়া যায়নি বা সক্রিয় নয়' };
    }

    if (!member.email) {
      return { success: false, error: 'সদস্যের কোনো ইমেইল ঠিকানা নেই' };
    }

    // Get the latest due record
    const latestDue = await Due.findOne({
      where: { memberId: member.id },
      order: [['year', 'DESC'], ['month', 'DESC']]
    });

    if (!latestDue || Number(latestDue.totalDue) <= 0 || latestDue.status === 'paid') {
      return { success: false, error: 'সদস্যের কোনো বকেয়া কিস্তি নেই' };
    }

    const breakdown = getDueBreakdown(member, latestDue);
    const htmlContent = renderReminderTemplate(member.name, member.id, latestDue.totalDue, breakdown);

    const emailRes = await sendEmail({
      to: member.email,
      subject: `[বকেয়া রিমাইন্ডার] আপনার বকেয়া জমার কিস্তি পরিশোধের বিবরণ`,
      html: htmlContent
    });

    return emailRes;
  } catch (error) {
    console.error(`Error sending individual reminder to member ${memberId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Queries all active members with dues and sends emails to them.
 * @returns {Promise<{eligible: number, sent: number, failed: number}>}
 */
async function sendDueRemindersToAll() {
  let eligible = 0;
  let sent = 0;
  let failed = 0;

  try {
    // 1. Get latest due records for all active members where totalDue > 0
    const activeMembers = await Member.findAll({ where: { status: 'active' } });

    for (const member of activeMembers) {
      const latestDue = await Due.findOne({
        where: { memberId: member.id },
        order: [['year', 'DESC'], ['month', 'DESC']]
      });

      if (latestDue && Number(latestDue.totalDue) > 0 && latestDue.status !== 'paid') {
        eligible++;
        const res = await sendDueReminder(member.id);
        if (res.success) {
          sent++;
        } else {
          failed++;
        }
      }
    }
  } catch (error) {
    console.error('Error during sendDueRemindersToAll operation:', error);
  }

  return { eligible, sent, failed };
}

module.exports = {
  sendDueReminder,
  sendDueRemindersToAll,
  getDueBreakdown
};
