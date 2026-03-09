const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listing.controller');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const ext = (path.extname(file.originalname) || '').toLowerCase() || '.jpg';
    const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  },
});
const upload = multer({ storage });

router.post('/', auth, upload.array('images', 20), listingController.create);
router.get('/', listingController.list);
router.get('/:id', listingController.getById);
router.post('/:id/report', auth, listingController.reportAd);
router.patch('/:id', auth, upload.array('images', 20), listingController.updateListing);
router.delete('/:id', auth, listingController.deleteListing);

module.exports = router;
