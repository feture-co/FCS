const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'storage', 'uploads')),
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '-')}`;
    cb(null, safeName);
  }
});

module.exports = multer({
  storage,
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/'))
});
