# Admin Panel API - Quick Reference Guide

## 📍 Base URL
```
http://localhost:5000/api/v1
```

## 🔑 Authentication
All endpoints (except login) require Bearer token in Authorization header:
```
Authorization: Bearer <admin_token>
```

**Get Token:**
```bash
node get_admin_token.js
```

---

## 📚 All 13 Endpoints

### 1️⃣ Admin Login
```
POST /admin/login
Body: { phone, otp }
Response: { token, user }
```

### 2️⃣ Get Dashboard
```
GET /admin/dashboard
Response: { 
  users: { total, active, banned, suspended, dailyActive },
  games: { total, active, completed },
  revenue: { today, week, month },
  stats: { ... }
}
```

### 3️⃣ Get All Users
```
GET /admin/users?page=1&limit=10
Response: { 
  users: [{ _id, name, phone, coins, status, createdAt }],
  total,
  page,
  pages
}
```

### 4️⃣ Get Single User
```
GET /admin/user/:userId
Response: { user: { ...full user data } }
```

### 5️⃣ Ban User
```
POST /admin/ban-user
Body: { userId, reason }
Response: { success: true, message: "User banned" }
```

### 6️⃣ Suspend User
```
POST /admin/suspend-user
Body: { userId, reason, duration: "24h" | "7d" | "30d" }
Response: { success: true, message: "User suspended", endTime: Date }
```

### 7️⃣ Get All Games
```
GET /admin/games?page=1&limit=10&status=active
Response: { 
  games: [...],
  total,
  page,
  pages
}
```

### 8️⃣ Get Live Games
```
GET /admin/live-games?limit=50
Response: { 
  games: [{ _id, players, entryFee, status, createdAt }],
  count
}
```

### 9️⃣ Force End Game
```
POST /admin/force-end-game
Body: { gameId, reason: "string" }
Response: { success: true, message: "Game ended", winner: {...} }
```

### 🔟 Adjust Wallet
```
POST /admin/wallet-adjustment
Body: { 
  userId, 
  amount: number,
  type: "add" | "deduct",
  reason: "string"
}
Response: { 
  success: true,
  transaction: {...},
  balance: number
}
```

### 1️⃣1️⃣ Set Bot Difficulty
```
POST /admin/set-difficulty
Body: { difficulty: "easy" | "medium" | "hard" }
Response: { success: true, difficulty: "hard" }
```

### 1️⃣2️⃣ Get Bot Difficulty
```
GET /admin/get-difficulty
Response: { difficulty: "hard" }
```

### 1️⃣3️⃣ Get Revenue
```
GET /admin/revenue?days=7&groupBy=day
Response: { 
  summary: { 
    totalRevenue: 350,
    avgDaily: 50,
    transactions: 10
  },
  data: [{ date, amount }]
}
```

---

## 🧪 Test Script Usage

### Run All Tests
```bash
# Generate admin token first
node get_admin_token.js

# Copy token and update test_admin_apis_advanced.js

# Run tests
node test_admin_apis_advanced.js
```

### Expected Output
```
✅ GET /admin/dashboard: Users: 4, Active Games: 0
✅ GET /admin/users: Retrieved 9 users
✅ POST /admin/ban-user: User banned successfully
✅ POST /admin/set-difficulty: Difficulty set to hard
✅ GET /admin/get-difficulty: Current difficulty: hard
```

---

## 📮 Using in Postman

### Setup
1. Open Postman
2. Import `Ludo_Admin_APIs.postman_collection.json`
3. Set environment variables:
   - `baseUrl`: `http://localhost:5000/api/v1`
   - `adminToken`: Get from `node get_admin_token.js`
   - `testUserId`: From test data
   - `testGameId`: From test data

### Make Request
```
Authorization: Bearer {{adminToken}}
GET {{baseUrl}}/admin/dashboard
```

---

## 🐛 Common Issues & Solutions

### Issue: 401 Unauthorized
```
Solution: Token expired or missing
Fix: Run get_admin_token.js again and update token
```

### Issue: 403 Forbidden
```
Solution: User is not admin
Fix: Ensure isAdmin field is true in database
```

### Issue: No users/games found
```
Solution: No test data in database
Fix: Create test data or run with existing database
```

### Issue: Network Error
```
Solution: Server not running
Fix: npm start
```

---

## 🔄 Workflow Example

### Complete Admin Workflow

```bash
# 1. Start server
npm start

# 2. Generate token in another terminal
node get_admin_token.js

# 3. Copy token to test script
# Update: adminToken = 'eyJh...'

# 4. Run tests
node test_admin_apis_advanced.js

# 5. View results
# ✅ All endpoints working
```

### Using in Frontend

```javascript
// Get admin token
const token = await getAdminToken();

// Use in requests
const response = await fetch('/api/v1/admin/dashboard', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
console.log(data.users, data.games);
```

---

## 📊 Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pages": 10,
    "limit": 10
  }
}
```

---

## 🚀 Deployment

### Before Deployment
1. ✅ All 13 endpoints tested
2. ✅ Admin users created with isAdmin: true
3. ✅ Authentication tokens generated
4. ✅ Error handling verified
5. ✅ Database indexes created

### Production Checklist
```bash
# Verify all endpoints
curl http://localhost:5000/api/v1/admin/dashboard \
  -H "Authorization: Bearer <token>"

# Check server logs
tail -f logs/server.log

# Monitor performance
node performance_monitor.js
```

---

## 📞 Support

For issues or questions:
1. Check test results: `ADMIN_API_TEST_RESULTS.md`
2. Review documentation: `ADMIN_API_TESTING_GUIDE.md`
3. Run tests: `node test_admin_apis_advanced.js`
4. Check server logs: `npm run logs`

---

**Version:** 1.0  
**Last Updated:** 25/5/2026  
**Status:** ✅ Production Ready
