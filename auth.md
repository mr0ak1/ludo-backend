🤖 AI PROMPT — OTP-Based Login System (PHP + MySQL)
Ye file ek ready-to-use AI prompt hai. Kisi bhi AI (ChatGPT, Gemini, Claude, etc.) ko ye poora file paste karo aur apna project ka context do — wo complete OTP login system bana dega.

📌 PROMPT START KARO — YE COPY KARO:
Mujhe ek complete OTP-based mobile login system PHP mein banana hai.

🎯 Requirements:
User apna 10-digit Indian mobile number enter kare
OTP SMS bheja jaye (6-digit, 5 minutes valid)
OTP verify hone par user login/register ho jaye (auto)
Naya user ho toh DB mein insert ho, purana ho toh sirf login ho
Session-based authentication (45 days persistent)
Optional referral code support
Welcome bonus system (DB se configure ho)
🔧 Tech Stack:
Language: PHP (7.4+)
Database: MySQL (MySQLi)
Frontend: HTML + Vanilla JavaScript + SweetAlert2
SMS API: [CHOOSE ONE — see below]
UI Library: Font Awesome 6, Google Fonts (Poppins)
📱 SMS API Options (Ek choose karo):
Option A — DV Hosting API (Simple GET request)

Endpoint: https://dvhosting.in/api-sms-v3.php
Method: GET
Params: api_key, number, otp
Example: https://dvhosting.in/api-sms-v3.php?api_key=YOUR_KEY&number=9876543210&otp=123456
PHP: file_get_contents($url) — OTP server side generate hota hai
Option B — 2Factor API (Session-based verify)

Send OTP:
  GET https://2factor.in/API/V1/{API_KEY}/SMS/{MOBILE}/AUTOGEN
  Response: { "Status": "Success", "Details": "SESSION_ID" }
  → SESSION_ID store karo session mein
Verify OTP:
  GET https://2factor.in/API/V1/{API_KEY}/SMS/VERIFY/{SESSION_ID}/{OTP}
  Response: { "Status": "Success" } ya { "Status": "Failure" }
  PHP: curl_exec() use karo
🗄️ Database Schema (MySQL):
sql

-- Users table
CREATE TABLE user (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(15) UNIQUE NOT NULL,  -- mobile number
    wallet_balance DECIMAL(10,2) DEFAULT 0.00,
    refer_code    VARCHAR(20) DEFAULT NULL,
    created_at    DATETIME DEFAULT NOW()
);
-- Transaction history
CREATE TABLE user_history (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL,
    type          VARCHAR(50),      -- e.g. 'Welcome Bonus'
    amount        DECIMAL(10,2),
    trans_type    ENUM('credit','debit'),
    activity_time DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES user(id)
);
-- Admin settings (for welcome bonus config)
CREATE TABLE admin_settings (
    id             INT PRIMARY KEY DEFAULT 1,
    welcome_bonus  DECIMAL(10,2) DEFAULT 50.00
);
INSERT INTO admin_settings VALUES (1, 50.00);
-- Referrals (optional)
CREATE TABLE referrals (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    referrer_id    INT,
    referee_id     INT,
    referrer_bonus DECIMAL(10,2),
    referee_bonus  DECIMAL(10,2),
    status         ENUM('pending','credited') DEFAULT 'pending',
    credited_at    DATETIME DEFAULT NULL
);
-- Refer earn settings (optional)
CREATE TABLE refer_earn_settings (
    id                   INT PRIMARY KEY DEFAULT 1,
    referrer_bonus       DECIMAL(10,2) DEFAULT 5.00,
    referee_bonus        DECIMAL(10,2) DEFAULT 10.00,
    min_deposit_required DECIMAL(10,2) DEFAULT 0.00
);
INSERT INTO refer_earn_settings VALUES (1, 5.00, 10.00, 0.00);
🏗️ File Structure jo banana hai:

/app/
 └── login.php          ← Main file (self-contained — AJAX + HTML + JS sab ek file mein)
/admin/conn/
 └── db.php             ← MySQLi connection file
(Optional — agar alag file chahiye)
/app/
 └── verify_otp.php     ← Sirf OTP verify ke liye alag endpoint
⚙️ PHP Backend Logic — login.php:
Action: send_otp

POST: action=send_otp, mobile=XXXXXXXXXX, ref_code=OPTIONAL
Steps:
1. Validate mobile: regex /^[6-9][0-9]{9}$/
2. ref_code sanitize karo (alphanumeric only, uppercase)
3. Session mein store karo: ref_code
4. OTP generate karo: rand(100000, 999999)
5. Session mein store karo: otp, otp_mobile, otp_time
6. SMS API call karo
7. JSON response do: { status, msg }
Action: verify_otp

POST: action=verify_otp, otp=XXXXXX
Steps:
1. Session check: otp, otp_time, otp_mobile exist?
   → Nahi: "Session expired" error
2. Expiry check: time() - otp_time > 300?
   → Haan: session clear, "OTP expired" error
3. OTP match: user_input == session otp?
   → Nahi: "Invalid OTP" error
4. DB: welcome_bonus fetch karo (admin_settings)
5. DB: user exist karta hai? (SELECT WHERE username = mobile)
   → YES: user_id fetch karo
   → NO:  INSERT user (mobile, wallet_balance=bonus)
           INSERT user_history (Welcome Bonus, credit)
           UPDATE user SET refer_code = strtoupper(substr(md5(id.microtime), 0, 8))
           Process referral (agar session ref_code set hai)
6. Session set: user_id, logged_in = true
7. Session clear: otp, otp_time, otp_mobile, ref_code
8. JSON: { status: success, already_registered: bool }
Referral Processing Logic:

agar ref_code session mein hai:
  → refer_earn_settings se bonuses fetch karo
  → referrer find karo (WHERE refer_code = ? AND id != new_user_id)
  → min_deposit_required <= 0?
       YES → Turant dono ko credit karo + referrals INSERT (status=credited)
       NO  → Pending referral create karo (status=pending)
🖥️ Frontend JavaScript Functions:
javascript

// 1. sendOTP()
//    - Mobile validate karo (client-side bhi)
//    - fetch() POST: action=send_otp
//    - Success: Step 1 hide karo, Step 2 show karo
//    - SweetAlert2 loading + success/error show karo
// 2. verifyOTP()
//    - OTP 6 digit check karo
//    - fetch() POST: action=verify_otp
//    - Success: window.location.replace('dashboard.php')
//    - Auto-trigger: jab input mein 6 digits complete hon
// 3. goBack()
//    - Step 2 se Step 1 wapas jaao
//    - OTP input clear karo
// 4. toggleRefBox()
//    - Referral code input show/hide karo
🎨 UI/UX Requirements:

Design Theme: Dark (black background) + Gold accents
Font: Google Fonts — Poppins
Components:
- Top header: Brand name + logo
- 2-step indicator (Mobile → Verify)
- Card layout with glass-morphism effect
- Mobile input with +91 prefix
- Collapsible referral code section
- 6-digit OTP input (large, centered, letter-spacing)
- SweetAlert2 for all alerts (dark theme)
- Auto-verify when 6 digits entered
- Enter key support
- WhatsApp support button (floating)
Color Variables:
  --gold-primary: #D4AF37
  --gold-light:   #F5D76E
  --gold-deep:    #A8851A
  --bg-dark:      #0A0A0A
  --bg-card:      #111111
  --text-white:   #F0ECD4
  --green-accent: #4CAF6E
🔒 Session Config:
php

session_set_cookie_params(3888000, '/'); // 45 days
session_start();
Session Variables:
Variable	Purpose
$_SESSION['otp']	Generated OTP value
$_SESSION['otp_mobile']	Mobile number for verification
$_SESSION['otp_time']	OTP generation timestamp
$_SESSION['ref_code']	Referral code (optional)
$_SESSION['user_id']	Logged-in user ID
$_SESSION['logged_in']	Auth flag (true)
📡 AJAX Response Formats:
send_otp:
json

{ "status": "success", "msg": "OTP sent successfully" }
{ "status": "error",   "msg": "Invalid mobile number" }
{ "status": "error",   "msg": "OTP sending failed. Please try again." }
verify_otp:
json

{ "status": "success", "msg": "Login successful", "already_registered": false }
{ "status": "error",   "msg": "Session expired. Please request OTP again." }
{ "status": "error",   "msg": "OTP expired. Please request a new one." }
{ "status": "error",   "msg": "Invalid OTP. Please try again." }
🔁 Resend OTP:

sendOTP() function dobara call karo — naya OTP generate hoga, session overwrite hoga, SMS dubara jayega
🛡️ Security Checklist:
 Server-side mobile validation (regex)
 OTP 5-minute expiry
 OTP sirf session mein — client ko kabhi bhejo nahi
 Prepared statements for all DB queries
 Ref code sanitize karo
 Already logged-in user ko dashboard redirect karo
 API key .env/config mein rakhna (hardcode mat karo)
 SSL verify_peer production pe enable karo
 Rate limiting add karo (OTP spam prevent)
📝 Customization Points (Replace these):
Placeholder	Replace With
YOUR_API_KEY	SMS provider ka actual API key
db.php path	Apne project ka DB connection file path
index.php / dashboard.php	Login ke baad redirect URL
admin_settings table	Apne project ka settings table
Brand name / colors	Apna brand
WhatsApp number	Apna support number
💬 Mujhe ye bhi batao (context ke liye):
Kaunsa SMS API use karna hai? (DV Hosting / 2Factor / koi aur)
Project ka naam/brand kya hai?
After login kahan redirect karna hai?
DB table names alag hain kya? (user, admin_settings, etc.)
Referral system chahiye ya nahi?
Welcome bonus feature chahiye ya nahi?
Single file chahiye (login.php) ya separate files?
📌 PROMPT KHATAM
Usage: Is file ko kisi bhi AI assistant ko do, upar ke customization points fill karo, aur apna complete OTP login system pao. Koi bhi external dependency nahi hai — sirf SMS API key chahiye.