# 📱 OTP Authentication & Login Flow API Details

Here are the real API credentials matching your current **2Factor.in** OTP integration, as well as the step-by-step logic flow so you can easily implement it in a separate system or external application.

---

## 🔑 1. Exact API Credentials

*   **API Provider:** 2Factor.in
*   **API Key:** `540b3832-502e-11f0-a562-0200cd936042`
*   **Response Format:** JSON

---

## 🛣️ 2. Step-by-Step API Flow

### Step 1: Request OTP (`send_otp.php` logic)
To generate and send the OTP to a mobile number:

*   **Method:** GET / POST
*   **API Endpoint:** 
    `https://2factor.in/API/V1/540b3832-502e-11f0-a562-0200cd936042/SMS/+91{MOBILE_NUMBER}/AUTOGEN`
*   **Success Response:**
    ```json
    {
      "Status": "Success",
      "Details": "SESSION_ID_STRING"
    }
    ```
*   **Your Backend Responsibility:**
    Extract `Details` (which is the session_ID) from the response and save it temporarily (e.g., in a PHP `$_SESSION['session_id']` or a database/Redis cache) mapping to that user's mobile number.

---

### Step 2: Verify OTP (`verify_otp.php` logic)
When the user submits the code they received:

*   **Method:** GET / POST
*   **API Endpoint:**
    `https://2factor.in/API/V1/540b3832-502e-11f0-a562-0200cd936042/SMS/VERIFY/{SESSION_ID}/{ENTERED_OTP}`
*   **Success Response:**
    ```json
    {
      "Status": "Success",
      "Details": "OTP Matched"
    }
    ```

---

### Step 3: Login & DB Operations Flow (Post-Verification)
Once the OTP is successfully verified (i.e. `Status === 'Success'`), follow this database flow:

1.  **Retrieve Welcome Bonus:** Query your app settings for the `welcome_bonus`.
    *(SQL: `SELECT welcome_bonus FROM admin_settings LIMIT 1`)*
2.  **Check User Existence:** Check if the user's mobile number exists in the `user` table.
    *(SQL: `SELECT id FROM user WHERE username = {MOBILE}`)*
3.  **If User Exists (Login):**
    *   Grab the user's `id`.
    *   Authenticate the session (`$_SESSION['user_id'] = $id; $_SESSION['logged_in'] = true;`).
4.  **If User Does NOT Exist (Registration):**
    *   Insert the new user and add the welcome bonus amount to their wallet.
        *(SQL: `INSERT INTO user (username, wallet_balance) VALUES ({MOBILE}, {BONUS})`)*
    *   Get the new `insert_id`.
    *   Add a transaction record to their transaction history.
        *(SQL: `INSERT INTO user_history (user_id, type, amount, trans_type, activity_time) VALUES ({NEW_USER_ID}, 'Welcome Bonus', {BONUS}, 'credit', NOW())`)*
    *   Authenticate the session using the new User ID.

---

### General Tips For Custom Implementation
*   **Rate Limiting:** Don't forget to implement a 60-second block between OTP requests (as currently done with `time() - $_SESSION['otp_time'][$mobile] < 60`) to prevent API abuse and wasting your SMS credits.
*   **Session Management:** The 2Factor.in API uses a specific `Session ID` generated during the OTP sending step, which MUST be passed during the Verify step. Always secure this properly.