const path = require('path');
const fs = require('fs');
const transporter = require('../config/mail');

const ASSETS = path.join(__dirname, '..', 'assets');
const LOGO_CANDIDATES = [
  path.join(ASSETS, 'logo.png'),
  path.join(ASSETS, 'c__Users_atifr_AppData_Roaming_Cursor_User_workspaceStorage_e608133b612f82375b0f2952a378ca18_images_logo-a48446e6-e2e9-4e61-9ce2-afb90419bdc9.png'),
];
const getLogoPath = () => LOGO_CANDIDATES.find(p => fs.existsSync(p)) || null;

const getOtpEmailHtml = (otp, hasLogo) => {
  const logoBlock = hasLogo
    ? `<img src="cid:logo" alt="Property Rent" style="max-width:180px;height:auto;display:block;margin:0 auto 24px;" />`
    : `<h1 style="color:#c41e3a;font-family:sans-serif;margin:0 0 24px;">Property Rent</h1>`;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your OTP - Property Rent</title>
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:sans-serif;">
  <div style="max-width:400px;margin:40px auto;padding:32px;background:#1a1a1a;border-radius:12px;text-align:center;">
    ${logoBlock}
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px;">Your verification code</h2>
    <p style="color:#888;font-size:14px;margin:0 0 24px;">Use this code to complete your signup. Valid for 5 minutes.</p>
    <p style="background:#c41e3a;color:#fff;font-size:28px;font-weight:bold;letter-spacing:8px;padding:16px 24px;border-radius:8px;margin:0 0 24px;">${otp}</p>
    <p style="color:#666;font-size:12px;margin:0;">If you didn't request this code, you can ignore this email.</p>
  </div>
</body>
</html>`;
};

const sendOtp = async (email, otp) => {
  const logoPath = getLogoPath();
  const hasLogo = !!logoPath;
  const mailOptions = {
    from: '"Property Rent" <' + (process.env.EMAIL_USER || 'propertyrent48@gmail.com') + '>',
    to: email,
    subject: 'Your verification code - Property Rent',
    html: getOtpEmailHtml(otp, hasLogo),
  };

  if (hasLogo) {
    mailOptions.attachments = [
      {
        filename: 'logo.png',
        content: fs.readFileSync(logoPath),
        cid: 'logo',
      },
    ];
  }

  await transporter.sendMail(mailOptions);
};

const getResetPasswordHtml = (code, hasLogo) => {
  const logoBlock = hasLogo
    ? `<img src="cid:logo" alt="Property Rent" style="max-width:180px;height:auto;display:block;margin:0 auto 24px;" />`
    : `<h1 style="color:#c41e3a;font-family:sans-serif;margin:0 0 24px;">Property Rent</h1>`;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Reset Password - Property Rent</title></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:sans-serif;">
  <div style="max-width:400px;margin:40px auto;padding:32px;background:#1a1a1a;border-radius:12px;text-align:center;">
    ${logoBlock}
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px;">Reset your password</h2>
    <p style="color:#888;font-size:14px;margin:0 0 24px;">Use this code in the app. Valid for 15 minutes.</p>
    <p style="background:#c41e3a;color:#fff;font-size:28px;font-weight:bold;letter-spacing:8px;padding:16px 24px;border-radius:8px;margin:0 0 24px;">${code}</p>
    <p style="color:#666;font-size:12px;margin:0;">If you didn't request this, ignore this email.</p>
  </div>
</body>
</html>`;
};

const sendResetCode = async (email, code) => {
  const logoPath = getLogoPath();
  const hasLogo = !!logoPath;
  const mailOptions = {
    from: '"Property Rent" <' + (process.env.EMAIL_USER || 'propertyrent48@gmail.com') + '>',
    to: email,
    subject: 'Reset password - Property Rent',
    html: getResetPasswordHtml(code, hasLogo),
  };
  if (hasLogo) {
    mailOptions.attachments = [{ filename: 'logo.png', content: fs.readFileSync(logoPath), cid: 'logo' }];
  }
  await transporter.sendMail(mailOptions);
};

const getReportEmailHtml = (report) => {
  const { listingId, listingTitle, reporterEmail, reporterContact, reason, details } = report;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>New Ad Report - Property Rent</title></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:sans-serif;">
  <div style="max-width:560px;margin:32px auto;padding:28px;background:#1a1a1a;border-radius:16px;color:#f5f5f5;">
    <h2 style="margin:0 0 16px;font-size:22px;">New Ad Report</h2>
    <p style="margin:0 0 16px;color:#bbbbbb;">A user has reported a property on Property Rent. Please review the details below.</p>

    <div style="margin-bottom:16px;padding:16px;border-radius:12px;background:#111;">
      <h3 style="margin:0 0 8px;font-size:18px;">Listing</h3>
      <p style="margin:0 0 4px;"><strong>ID:</strong> ${listingId ?? '-'} </p>
      <p style="margin:0;"><strong>Title:</strong> ${listingTitle || 'N/A'}</p>
    </div>

    <div style="margin-bottom:16px;padding:16px;border-radius:12px;background:#111;">
      <h3 style="margin:0 0 8px;font-size:18px;">Reporter</h3>
      <p style="margin:0 0 4px;"><strong>Email:</strong> ${reporterEmail || 'N/A'}</p>
      <p style="margin:0;"><strong>Contact:</strong> ${reporterContact || reporterEmail || 'N/A'}</p>
    </div>

    <div style="margin-bottom:16px;padding:16px;border-radius:12px;background:#111;">
      <h3 style="margin:0 0 8px;font-size:18px;">Issue</h3>
      <p style="margin:0 0 4px;"><strong>Reason:</strong> ${reason}</p>
      <p style="margin:8px 0 0;white-space:pre-wrap;"><strong>Details:</strong><br>${details || 'No extra details provided.'}</p>
    </div>

    <p style="margin:16px 0 0;font-size:12px;color:#777;">This email was sent automatically by Property Rent.</p>
  </div>
</body>
</html>`;
};

const sendReportEmail = async (report) => {
  const html = getReportEmailHtml(report);
  const to = process.env.REPORT_EMAIL || process.env.EMAIL_USER || 'propertyrent48@gmail.com';
  const mailOptions = {
    from: '"Property Rent" <' + (process.env.EMAIL_USER || 'propertyrent48@gmail.com') + '>',
    to,
    subject: 'New Ad Report - Property Rent',
    html,
  };
  await transporter.sendMail(mailOptions);
};

module.exports = { sendOtp, sendResetCode, sendReportEmail };
