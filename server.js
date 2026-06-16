require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');

const { sequelize } = require('./models');
const { attachUser } = require('./middleware/auth');
const { startDueCron } = require('./jobs/dueCron');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'storage', 'uploads')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

const sessionStore = new SequelizeStore({ db: sequelize });
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));
app.use(flash());
app.use(csrf({ cookie: false }));
app.use(attachUser);
app.use((req, res, next) => {
  res.locals.appName = process.env.APP_NAME || 'বন্ধু ফান্ড ম্যানেজমেন্ট সিস্টেম';
  res.locals.user = req.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.csrfToken = req.csrfToken();
  res.locals.currentPath = req.path;
  res.locals.money = value => `৳${Number(value || 0).toLocaleString('bn-BD')}`;
  res.locals.bn = value => Number(value || 0).toLocaleString('bn-BD');
  res.locals.bnYear = value => String(value || '').replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
  res.locals.imgUrl = filename => {
    if (!filename) return '';
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      return filename;
    }
    return `/uploads/${filename}`;
  };
  next();
});

app.use('/', require('./routes/authRoutes'));
app.use('/admin', require('./routes/adminRoutes'));
app.use('/member', require('./routes/memberRoutes'));
app.use('/reports', require('./routes/reportRoutes'));
app.use('/api', require('./routes/apiRoutes'));

app.get('/offline.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'offline.html')));
app.use((req, res) => res.status(404).render('404', { title: 'পাতা পাওয়া যায়নি' }));
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    req.flash('error', 'সেশন শেষ হয়েছে, আবার চেষ্টা করুন।');
    return res.redirect('/login');
  }
  if (err.name === 'MulterError' || err.code === 'LIMIT_FILE_SIZE') {
    req.flash('error', 'ফাইলের সাইজ অনেক বড় (সর্বোচ্চ ২ MB)। অনুগ্রহ করে ছোট সাইজের ছবি আপলোড করুন।');
    return res.redirect(req.get('Referrer') || '/member/profile');
  }
  console.error(err);
  res.status(500).render('500', { title: 'সার্ভার সমস্যা' });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  (async () => {
    try {
      await sequelize.authenticate();
      await sessionStore.sync();
      await sequelize.sync();
      startDueCron();
      app.listen(port, () => console.log(`Future Co-Operative Socitey (FCS) running at http://localhost:${port}`));
    } catch (e) {
      console.error('Local startup error:', e);
    }
  })();
} else {
  // Database connection sync for Serverless environment
  (async () => {
    try {
      await sequelize.authenticate();
      await sessionStore.sync();
      await sequelize.sync();
      console.log('Database connected and synchronized in serverless environment.');
    } catch (e) {
      console.error('Serverless database sync error:', e);
    }
  })();
}

module.exports = app;
