# Future Co-Operative Socitey (FCS) - ম্যানেজমেন্ট সিস্টেম

Node.js, Express.js, MySQL, Sequelize ORM, JWT Authentication, Bootstrap 5, EJS, Service Worker এবং Push Notification ভিত্তিক PWA।

## প্রধান ফিচার

- Admin এবং Member role based login
- JWT cookie authentication, logout, remember login, password reset
- সদস্য, জমা, বকেয়া, বিনিয়োগ, লাভ, নোটিশ ব্যবস্থাপনা
- শেয়ারভিত্তিক লাভ বণ্টন: `(Total Profit * Member Shares) / Total Shares`
- মাসিক বকেয়া তৈরির cron job
- Member dashboard, profile, notice এবং ledger statement
- PDF ও Excel report export
- PWA install button, manifest, service worker, offline page, app icons
- Push notification, notification permission, subscription save, background sync hook
- Helmet, rate limit, CSRF, Sequelize query protection, XSS sanitizing

## ইনস্টলেশন

1. MySQL এ database তৈরি করুন:

```sql
CREATE DATABASE bondhu_fund CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. `.env.example` কপি করে `.env` বানান এবং DB তথ্য দিন।

3. dependency ইনস্টল করুন:

```bash
npm install
```

4. Demo admin/member তৈরি করুন:

```bash
npm run seed
```

5. অ্যাপ চালু করুন:

```bash
npm start
```

Default URL: `http://localhost:3000`

Demo Login:

- Admin: `admin@bondhu.test` / `12345678`
- Member: `member@bondhu.test` / `12345678`

## Push Notification Setup

VAPID key তৈরি করুন:

```bash
npx web-push generate-vapid-keys
```

তারপর `.env` ফাইলে `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` সেট করুন।

## PWA Notes

- Android Chrome এ install prompt দেখাবে।
- iPhone Safari এ Share > Add to Home Screen ব্যবহার করুন।
- Offline অবস্থায় `offline.html` দেখাবে: “আপনি বর্তমানে ইন্টারনেট সংযোগ ছাড়া আছেন”।
- Dashboard, notices, profile এবং static assets service worker cache করবে।

## Folder Structure

```text
config/          database config
controllers/     MVC controllers
jobs/            monthly due cron
middleware/      auth and upload middleware
models/          Sequelize models
public/          PWA assets, CSS, JS, icons
routes/          web and API routes
services/        fund and push services
storage/         uploaded member photos
views/           Bangla EJS UI
```
