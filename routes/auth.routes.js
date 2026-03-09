const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

router.post('/signup', upload.single('profile_image'), authController.signup);
router.post('/verify-otp', authController.verifyOtp);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/profile', auth, authController.getProfile);
router.post('/profile/update', auth, upload.single('profile_image'), authController.updateProfile);
router.post('/profile/change-password', auth, authController.changePassword);

module.exports = router;
