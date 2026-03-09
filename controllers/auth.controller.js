const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const otpService = require('../services/otp.service');
const emailService = require('../services/email.service');
const googleAuthService = require('../services/googleAuth.service');

const signup = async (req, res) => {
  try {
    const { username, email, contact, password, confirm_password } = req.body;
    const profile_image = req.file ? req.file.filename : null;

    if (!username || !email || !contact || !password || !confirm_password)
      return res.status(400).json({ message: 'All fields required: username, email, contact, password, confirm_password' });

    if (!profile_image)
      return res.status(400).json({ message: 'Profile image is required' });

    if (password !== confirm_password)
      return res.status(400).json({ message: 'Password mismatch' });

    const emailNormalized = String(email).trim().toLowerCase();
    if (!emailNormalized)
      return res.status(400).json({ message: 'Invalid email' });

    const contactTrimmed = String(contact).trim();
    if (!contactTrimmed)
      return res.status(400).json({ message: 'Contact is required' });

    const existing = await pool.query('SELECT * FROM users WHERE LOWER(TRIM(email)) = $1', [emailNormalized]);
    if (existing.rows.length > 0)
      return res.status(400).json({ message: 'Email already exists. Please login or use another email.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = otpService.generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await pool.query(
      'INSERT INTO otp_verifications(email, otp, expires_at) VALUES($1,$2,$3)',
      [emailNormalized, otp, expiresAt]
    );

    await emailService.sendOtp(emailNormalized, otp);

    req.app.locals.tempUser = { username, email: emailNormalized, contact: contactTrimmed, password: hashedPassword, profile_image };

    res.json({ message: 'OTP sent to email' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const emailNormalized = String(email || '').trim().toLowerCase();
    if (!emailNormalized || !otp) return res.status(400).json({ message: 'Email and OTP required' });
    const result = await pool.query(
      'SELECT * FROM otp_verifications WHERE email=$1 AND otp=$2',
      [emailNormalized, otp]
    );

    if (result.rows.length === 0)
      return res.status(400).json({ message: 'Invalid OTP' });

    const now = new Date();
    if (new Date(result.rows[0].expires_at) < now)
      return res.status(400).json({ message: 'OTP expired' });

    const tempUser = req.app.locals.tempUser;
    if (!tempUser || tempUser.email !== emailNormalized)
      return res.status(400).json({ message: 'Signup session expired. Please signup again.' });

    await pool.query(
      'INSERT INTO users(username,email,contact,password,profile_image,is_verified) VALUES($1,$2,$3,$4,$5,$6)',
      [tempUser.username, tempUser.email, tempUser.contact, tempUser.password, tempUser.profile_image, true]
    );

    await pool.query('DELETE FROM otp_verifications WHERE email=$1', [emailNormalized]);
    req.app.locals.tempUser = null;

    const token = jwt.sign({ email: tempUser.email }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ message: 'Signup successful', token });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailNormalized = String(email || '').trim().toLowerCase();
    if (!emailNormalized) return res.status(400).json({ message: 'Email required' });
    const user = await pool.query('SELECT * FROM users WHERE LOWER(TRIM(email)) = $1', [emailNormalized]);
    if (user.rows.length === 0) return res.status(400).json({ message: 'User not found' });

    const row = user.rows[0];
    if (!row.password)
      return res.status(400).json({ message: 'This account uses Google sign-in. Please use Google to login.' });

    const valid = await bcrypt.compare(password, row.password);
    if (!valid) return res.status(400).json({ message: 'Invalid password' });

    if (!row.is_verified) return res.status(400).json({ message: 'Email not verified' });

    const token = jwt.sign({ email: row.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { id_token } = req.body;
    if (!id_token)
      return res.status(400).json({ message: 'id_token required' });

    const payload = await googleAuthService.verifyGoogleIdToken(id_token);
    const email = payload.email ? String(payload.email).trim().toLowerCase() : null;
    if (!email)
      return res.status(400).json({ message: 'Google account email not found' });

    const googleId = payload.sub;
    const username = payload.name || email.split('@')[0];
    const profileImage = payload.picture || null;

    const existing = await pool.query('SELECT id, email, username, profile_image FROM users WHERE LOWER(TRIM(email)) = $1', [email]);

    if (existing.rows.length > 0) {
      const u = existing.rows[0];
      await pool.query(
        'UPDATE users SET google_id = $1, is_verified = true, username = COALESCE(NULLIF(TRIM(username), \'\'), $2), profile_image = COALESCE(profile_image, $3) WHERE id = $4',
        [googleId, username, profileImage, u.id]
      );
    } else {
      await pool.query(
        'INSERT INTO users(email, username, profile_image, google_id, is_verified) VALUES($1, $2, $3, $4, true)',
        [email, username, profileImage, googleId]
      );
    }

    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.log(err);
    if (err.message && (err.message.includes('token') || err.message.includes('invalid')))
      return res.status(400).json({ message: 'Invalid Google token. Please try again.' });
    res.status(500).json({ message: 'Server error' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const emailNormalized = String(email || '').trim().toLowerCase();
    if (!emailNormalized) return res.status(400).json({ message: 'Email required' });

    const user = await pool.query('SELECT * FROM users WHERE LOWER(TRIM(email)) = $1', [emailNormalized]);
    if (user.rows.length === 0)
      return res.status(400).json({ message: 'No account found with this email' });

    const code = otpService.generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await pool.query('DELETE FROM password_resets WHERE email = $1', [emailNormalized]);
    await pool.query('INSERT INTO password_resets(email, token, expires_at) VALUES($1,$2,$3)', [emailNormalized, code, expiresAt]);

    await emailService.sendResetCode(emailNormalized, code);
    res.json({ message: 'Reset code sent to your email. Valid for 15 minutes.' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, code, new_password, confirm_password } = req.body;
    const emailNormalized = String(email || '').trim().toLowerCase();
    if (!emailNormalized || !code || !new_password || !confirm_password)
      return res.status(400).json({ message: 'Email, code, new_password and confirm_password required' });
    if (new_password !== confirm_password)
      return res.status(400).json({ message: 'Passwords do not match' });

    const row = await pool.query('SELECT * FROM password_resets WHERE email = $1 AND token = $2', [emailNormalized, code]);
    if (row.rows.length === 0) return res.status(400).json({ message: 'Invalid or expired reset code' });
    if (new Date(row.rows[0].expires_at) < new Date()) {
      await pool.query('DELETE FROM password_resets WHERE email = $1', [emailNormalized]);
      return res.status(400).json({ message: 'Reset code expired. Request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password = $1 WHERE LOWER(TRIM(email)) = $2', [hashedPassword, emailNormalized]);
    await pool.query('DELETE FROM password_resets WHERE email = $1', [emailNormalized]);

    res.json({ message: 'Password reset successful. You can login now.' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) return res.status(401).json({ message: 'Unauthorized' });
    const result = await pool.query(
      'SELECT id, username, email, contact, profile_image, google_id, is_verified, created_at FROM users WHERE LOWER(TRIM(email)) = $1',
      [email.toLowerCase()]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });
    const user = result.rows[0];
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const profileImageUrl = user.profile_image
      ? (user.profile_image.startsWith('http') ? user.profile_image : `${baseUrl}/uploads/${user.profile_image}`)
      : null;
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      contact: user.contact,
      profile_image: profileImageUrl,
      is_verified: user.is_verified,
      created_at: user.created_at,
      auth_provider: user.google_id ? 'google' : 'email',
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) return res.status(401).json({ message: 'Unauthorized' });

    const { username, contact } = req.body || {};

    const existing = await pool.query(
      'SELECT id, username, contact, profile_image FROM users WHERE LOWER(TRIM(email)) = $1',
      [email.toLowerCase()]
    );
    if (existing.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });

    const user = existing.rows[0];
    const newUsername = (username && username.trim().length > 0) ? username.trim() : user.username;
    const newContact = (contact && contact.trim().length > 0) ? contact.trim() : user.contact;
    const newProfileImage = req.file ? req.file.filename : user.profile_image;

    await pool.query(
      'UPDATE users SET username = $1, contact = $2, profile_image = $3 WHERE id = $4',
      [newUsername, newContact, newProfileImage, user.id]
    );

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const profileImageUrl = newProfileImage
      ? (newProfileImage.startsWith('http') ? newProfileImage : `${baseUrl}/uploads/${newProfileImage}`)
      : null;

    res.json({
      message: 'Profile updated successfully',
      profile: {
        id: user.id,
        username: newUsername,
        email,
        contact: newContact,
        profile_image: profileImageUrl,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /api/auth/profile/change-password (auth)
 * Body: current_password, new_password, confirm_password
 */
const changePassword = async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) return res.status(401).json({ message: 'Unauthorized' });

    const { current_password, new_password, confirm_password } = req.body || {};
    if (!current_password || !new_password || !confirm_password)
      return res.status(400).json({ message: 'Current password, new password and confirm password are required' });
    if (new_password !== confirm_password)
      return res.status(400).json({ message: 'New password and confirm password do not match' });
    if (new_password.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const r = await pool.query(
      'SELECT id, password FROM users WHERE LOWER(TRIM(email)) = $1',
      [email.toLowerCase()]
    );
    if (r.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const row = r.rows[0];
    if (!row.password)
      return res.status(400).json({ message: 'This account uses Google sign-in. Password cannot be changed here.' });

    const valid = await bcrypt.compare(current_password, row.password);
    if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, row.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  signup,
  verifyOtp,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
};
