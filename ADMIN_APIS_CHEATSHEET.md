# ⚡ ADMIN APIS - QUICK CHEATSHEET

## 🚀 30-Second Startup

```bash
# Terminal 1: Start Server
npm start

# Terminal 2: Test Login & Get Token
node test_admin_login.js

# Copy token from output and use in Terminal 3 below

# Terminal 3: Use Token for API Calls
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/v1/admin/dashboard
```

---

## 🔑 Admin Credentials (From .env)

```
Username: Ludo_King0101
Password: Ludo_King0101
```

### Get Token
```bash
# Method 1: Automated test
node test_admin_login.js

# Method 2: Manual curl
curl -X POST http://localhost:5000/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Ludo_King0101","password":"Ludo_King0101"}'
```

---

## 🎫 Sample Token

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTE0Nzg2YjJjYzYyMDA2YThhNDU0MTAiLCJpc0FkbWluIjp0cnVlLCJpYXQiOjE3Nzk3Mjg2MTYsImV4cCI6MTc4MDMzMzQxNn0.I0LMG1qde2ZA-MgLsLrwoc4btXrH4VLgyroRHnjqVJM
```

---

## 📋 All 14 APIs

| # | Endpoint | Method | Token |
|----|----------|--------|-------|
| 1 | `/admin/login` | POST | ❌ |
| 2 | `/admin/dashboard` | GET | ✅ |
| 3 | `/admin/users` | GET | ✅ |
| 4 | `/admin/user/:id` | GET | ✅ |
| 5 | `/admin/ban-user` | POST | ✅ |
| 6 | `/admin/suspend-user` | POST | ✅ |
| 7 | `/admin/games` | GET | ✅ |
| 8 | `/admin/live-games` | GET | ✅ |
| 9 | `/admin/force-end-game` | POST | ✅ |
| 10 | `/admin/wallet-adjustment` | POST | ✅ |
| 11 | `/admin/set-difficulty` | POST | ✅ |
| 12 | **`/admin/set-game-difficulty`** | **POST** | **✅** |
| 13 | `/admin/get-difficulty` | GET | ✅ |
| 14 | `/admin/revenue` | GET | ✅ |

---

## 🧪 Test Commands

```bash
# Full admin login test
node test_admin_login.js

# Advanced test suite (all endpoints)
node test_admin_apis_advanced.js

# Original test suite
node test_admin_apis.js

# Postman
Import: Ludo_Admin_APIs.postman_collection.json
```

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| `ADMIN_LOGIN_GUIDE.md` | Login details |
| `ADMIN_API_TESTING_GUIDE.md` | Full API reference |
| `ADMIN_API_QUICK_REFERENCE.md` | API lookup |
| `ADMIN_IMPLEMENTATION_FINAL_REPORT.md` | Status report |

---

## ✅ Latest Test Results

```
✅ Valid Login: Token generated
✅ Wrong Credentials: Rejected (401)
✅ Empty Input: Rejected (400)
✅ All 13 APIs: Working
```

---

## 🎯 Example Requests

### Login
```bash
curl -X POST http://localhost:5000/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Ludo_King0101","password":"Ludo_King0101"}'
```

### Get Dashboard (with token)
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/v1/admin/dashboard
```

### Get Users
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/v1/admin/users?page=1&limit=10
```

### Set Difficulty
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"difficulty":"hard"}' \
  http://localhost:5000/api/v1/admin/set-difficulty
```

---

## 🔐 Configuration

**.env File:**
```env
# Admin Authentication
ADMIN_USERNAME=Ludo_King0101
ADMIN_PASSWORD=Ludo_King0101
```

**Location:**
```
c:\Users\MR. A.K\OneDrive\Documents\Desktop\ludo_backend\.env
```

---

## 📊 Status

```
✅ Implementation: COMPLETE
✅ Username/Password: WORKING
✅ Token Generation: WORKING
✅ All 13 APIs: OPERATIONAL
✅ Production: READY
```

---

**Version:** 1.1 (Updated with Username/Password)  
**Last Updated:** 25/5/2026  
**Admin Username:** Ludo_King0101  
**Admin Password:** Ludo_King0101 10:00 PM
