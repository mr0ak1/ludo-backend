# 🎯 Admin Login - Quick Reference

## 📋 Login Details

```
Endpoint: POST /admin/login
Base URL: http://localhost:5000/api/v1
```

---

## 🔑 Credentials (From .env)

```
Username: Ludo_King0101
Password: Ludo_King0101
```

---

## ⚡ 3 Ways to Login

### 1️⃣ Test Script (Easiest)
```bash
node test_admin_login.js
```
**Output:** Ready-to-use token

---

### 2️⃣ cURL Command
```bash
curl -X POST http://localhost:5000/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Ludo_King0101","password":"Ludo_King0101"}'
```
**Response:** JSON with token

---

### 3️⃣ JavaScript/Fetch
```javascript
const res = await fetch('http://localhost:5000/api/v1/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'Ludo_King0101',
    password: 'Ludo_King0101'
  })
});

const { data } = await res.json();
console.log(data.token); // Use this token
```

---

## 🎫 Token Usage

```bash
# Use token in Authorization header
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
  http://localhost:5000/api/v1/admin/dashboard
```

---

## 📚 Full Documentation

- **Complete Guide:** [ADMIN_LOGIN_GUIDE.md](ADMIN_LOGIN_GUIDE.md)
- **Update Details:** [ADMIN_LOGIN_UPDATE.md](ADMIN_LOGIN_UPDATE.md)
- **All APIs:** [ADMIN_API_TESTING_GUIDE.md](ADMIN_API_TESTING_GUIDE.md)

---

## 🧪 Test It Now

```bash
# Terminal 1: Start server (if not running)
npm start

# Terminal 2: Test login
node test_admin_login.js

# Copy the token from output
# Use it in curl or code
```

---

## ✅ Test Results

```
✅ Valid credentials: Login successful
❌ Invalid credentials: 401 Unauthorized
❌ Empty credentials: 400 Bad Request
✅ All 13 admin APIs: Work with token
```

---

**Version:** 1.0  
**Status:** ✅ Production Ready
