const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { Member, Deposit, Due, Investment, Profit, Transaction } = require('../models');
const { getFundStats } = require('../services/fundService');

const map = {
  members: { title: 'সদস্য রিপোর্ট', model: Member },
  deposits: { title: 'জমা রিপোর্ট', model: Deposit },
  dues: { title: 'বকেয়া রিপোর্ট', model: Due },
  investments: { title: 'বিনিয়োগ রিপোর্ট', model: Investment },
  profits: { title: 'লাভ রিপোর্ট', model: Profit }
};

exports.index = async (req, res) => {
  const [stats, members, transactions] = await Promise.all([
    getFundStats(),
    Member.findAll({ where: { status: 'active' } }),
    Transaction.findAll({
      include: Member,
      limit: 20,
      order: [['transactionDate', 'DESC']]
    })
  ]);
  res.render('reports/index', { title: 'রিপোর্ট', stats, members, transactions });
};

exports.exportReport = async (req, res) => {
  const config = map[req.params.type];
  if (!config) return res.redirect('/reports');
  const rows = await config.model.findAll({ raw: true });
  if (req.params.format === 'excel') return exportExcel(res, config.title, rows);
  return exportPdf(res, config.title, rows);
};

async function exportExcel(res, title, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title);
  if (rows[0]) sheet.columns = Object.keys(rows[0]).map(key => ({ header: key, key, width: 18 }));
  rows.forEach(row => sheet.addRow(row));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${Date.now()}-report.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

function exportPdf(res, title, rows) {
  const doc = new PDFDocument({ margin: 36 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${Date.now()}-report.pdf"`);
  doc.pipe(res);
  doc.fontSize(18).text(title);
  doc.moveDown();
  rows.slice(0, 100).forEach(row => doc.fontSize(9).text(JSON.stringify(row)));
  doc.end();
}
