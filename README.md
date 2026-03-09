# PR Backend – Node.js + PostgreSQL

Signup, OTP verify, login, profile image upload.

## Setup

1. **Install dependencies**
   ```bash
   cd pr-backend
   npm install
   ```

2. **Edit `.env`**  
   Set your PostgreSQL password, JWT secret, and (optional) email:
   - `DB_PASSWORD` = your Postgres password  
   - `JWT_SECRET` = any long random string  
   - `EMAIL_USER` / `EMAIL_PASS` = Gmail + app password (for OTP emails)

3. **Create database and tables**
   ```bash
   npm run init-db
   ```
   This creates database `pr_db` and tables: `users`, `otp_verifications`, `password_resets`.

4. **Start server**
   ```bash
   npm start
   ```
   Server runs on http://localhost:5000

## API

- `POST /api/auth/signup` – form-data: username, email, password, confirm_password, profile_image (optional)
- `POST /api/auth/verify-otp` – JSON: { "email", "otp" }
- `POST /api/auth/login` – JSON: { "email", "password" }

## Requirements

- Node.js
- PostgreSQL installed and running (default port 5432)
