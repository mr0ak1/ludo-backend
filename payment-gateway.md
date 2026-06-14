# 🚀 Ultimate UPI & Paytm Payment Gateway Integration Guide (PHP + MySQL)
*(UPI & Paytm पेमेंट गेटवे इंटीग्रेशन और एडमिन पैनल मैनेजमेंट गाइड)*

This is a comprehensive, step-by-step developer guide to implement and manage payment gateways (manual UPI ID, Paytm Merchant ID, and EKQR UPI Gateway) in a PHP/MySQL project. 

यह गाइड इस तरह लिखी गई है कि कोई भी नया डेवलपर इसे पढ़कर बहुत ही आसानी से (Copy-Paste करके) अपने नए प्रोजेक्ट में पूरा पेमेंट सिस्टम चालू कर सके।

---

## 📋 Table of Contents (अनुक्रमणिका)
1. [Prerequisites & Account Setup (आवश्यकताएं और अकाउंट सेटअप)](#1-prerequisites--account-setup)
2. [Database Schema (डेटाबेस टेबल्स संरचना)](#2-database-schema)
3. [Admin Panel Settings (एडमिन पैनल मैनेजमेंट)](#3-admin-panel-settings)
4. [User App Side Flow (यूज़र साइड पेमेंट फ्लो)](#4-user-app-side-flow)
   - [`addfund.php` (Amount UI)](#a-addfundphp-amount-ui)
   - [`initiate_payment.php` (Order Creation)](#b-initiate_paymentphp-order-creation)
   - [`payment_callback.php` (Auto-Verification)](#c-payment_callbackphp-auto-verification)
   - [`verify_pending_deposits.php` (Pending Reconciliation)](#d-verify_pending_depositsphp-pending-reconciliation)
5. [Security & Verification Checklist (सुरक्षा और सावधानियां)](#5-security--verification-checklist)

---

## 1. Prerequisites & Account Setup (आवश्यकताएं और अकाउंट सेटअप)

इस पेमेंट सिस्टम को चालू करने के लिए आपके पास निम्नलिखित Credentials/Accounts होने चाहिए:

1. **UPI Gateway Merchant ID (EKQR API Key):**
   * **कहाँ से मिलेगी?** [EKQR.in](https://ekqr.in/) पर मर्चेंट रजिस्टर करें।
   * **काम:** यह ऑटोमैटिक UPI QR कोड और डायरेक्ट पे बटन (GPay/PhonePe) जनरेट करने के लिए आवश्यक API Key है।
2. **Paytm Merchant ID:**
   * **कहाँ से मिलेगी?** Paytm Business Dashboard (Dashboard -> Developer settings -> API Keys) से।
   * **काम:** Paytm पेमेंट गेटवे के जरिए पेमेंट लेने के लिए मर्चेंट आईडी।
3. **UPI ID (VPA):**
   * **कहाँ से मिलेगी?** आपका कोई भी एक्टिव UPI एड्रेस (जैसे `yourname@ybl`, `company@paytm`)।
   * **काम:** कस्टमर को मैनुअल पेमेंट या रेफरेंस के लिए दिखाने के लिए।
4. **Hosting Support:** PHP cURL एक्सटेंशन और SSL (HTTPS) डोमेन।

---

## 2. Database Schema (डेटाबेस टेबल्स संरचना)

डेवलपर सबसे पहले अपने MySQL डेटाबेस में निम्नलिखित SQL स्क्रिप्ट रन करें:

```sql
-- 1. Deposits Table (पेमेंट रिकॉर्ड्स रखने के लिए)
CREATE TABLE IF NOT EXISTS `deposits` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `client_txn_id` VARCHAR(50) NOT NULL UNIQUE,
  `status` VARCHAR(20) DEFAULT 'Pending', -- पेंडिंग भुगतान ट्रैक करने के लिए
  `date` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Contact & Gateway Settings Table (यह एडमिन सेटिंग्स स्टोर करेगी)
CREATE TABLE IF NOT EXISTS `contact_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `mobile_number` VARCHAR(15) DEFAULT NULL,
  `whatsapp_number` VARCHAR(15) DEFAULT NULL,
  `upi_id` VARCHAR(100) DEFAULT NULL,                 -- (मैनुअल UPI ID के लिए)
  `paytm_merchant_id` VARCHAR(255) DEFAULT NULL,       -- (Paytm मर्चेंट आईडी)
  `upi_gateway_merchant_id` VARCHAR(255) DEFAULT NULL, -- (EKQR API मर्चेंट की)
  `add_point_status` VARCHAR(10) DEFAULT 'on',
  `withdraw_point_status` VARCHAR(10) DEFAULT 'on'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- डिफ़ॉल्ट रूप से एक सेटिंग इंसर्ट कर लें (ID = 1)
INSERT INTO `contact_settings` (`id`, `upi_id`, `paytm_merchant_id`, `upi_gateway_merchant_id`) 
VALUES (1, 'demo@upi', 'PAYTM_MID_HERE', 'EKQR_API_KEY_HERE')
ON DUPLICATE KEY UPDATE id=id;

-- 3. Users Table Structure (वॉलेट बैलेंस अपडेट करने के लिए)
CREATE TABLE IF NOT EXISTS `user` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL,
  `wallet_balance` DECIMAL(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. General Admin Settings Table (मिनिमम और मैक्सिमम डिपॉज़िट लिमिट्स)
CREATE TABLE IF NOT EXISTS `admin_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `min_deposit` INT DEFAULT 100,
  `max_deposit` INT DEFAULT 10000
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `admin_settings` (`id`, `min_deposit`, `max_deposit`) VALUES (1, 100, 10000)
ON DUPLICATE KEY UPDATE id=id;
```

---

## 3. Admin Panel Settings (एडमिन पैनल मैनेजमेंट)

एडमिन पैनल के ज़रिए इन गेटवे डिटेल्स को मैनेज करने के लिए डेवलपर इस कोड को अपने सेटिंग पेज पर लगा सकता है।

### 🖥️ `admin/pages/tables/contact_setting.php`
यह पेज डेटाबेस से UPI ID, Paytm Merchant ID और UPI Gateway Merchant ID लोड करता है और एडमिन को इसे बदलने की अनुमति देता है।

```php
<?php
// डेटाबेस कनेक्शन फ़ाइल लोड करें
require '../../../admin/conn/db.php';

$success = "";

// 1. डेटाबेस से पुरानी सेटिंग्स लाएं
$contact = $conn->query("SELECT * FROM contact_settings WHERE id = 1")->fetch_assoc();

// 2. जब फॉर्म सबमिट हो
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $upi_id = trim($_POST['upi_id'] ?? '');
    $paytm_mid = trim($_POST['paytm_merchant_id'] ?? '');
    $upi_gateway_key = trim($_POST['upi_gateway_merchant_id'] ?? '');

    $stmt = $conn->prepare("UPDATE contact_settings SET upi_id = ?, paytm_merchant_id = ?, upi_gateway_merchant_id = ? WHERE id = 1");
    $stmt->bind_param("sss", $upi_id, $paytm_mid, $upi_gateway_key);
    
    if ($stmt->execute()) {
        $success = "✅ All Settings updated successfully!";
        // दोबारा अपडेटेड डेटा लाएं
        $contact = $conn->query("SELECT * FROM contact_settings WHERE id = 1")->fetch_assoc();
    } else {
        $success = "❌ Failed to update settings.";
    }
    $stmt->close();
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Admin - Gateway Settings</title>
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
</head>
<body style="background: #f4f6f9; padding: 20px;">
    <div class="container" style="max-width: 700px; margin-top: 30px;">
        <div class="panel panel-primary">
            <div class="panel-heading">
                <h3 class="panel-title">UPI & Paytm Gateway Configuration</h3>
            </div>
            <div class="panel-body">
                <?php if (!empty($success)): ?>
                    <div class="alert alert-info"><?= $success ?></div>
                <?php endif; ?>

                <form method="POST">
                    <!-- 1. UPI ID Field -->
                    <div class="form-group">
                        <label>Manual UPI ID (for user reference)</label>
                        <input type="text" name="upi_id" class="form-control" 
                               value="<?= htmlspecialchars($contact['upi_id'] ?? '') ?>" placeholder="e.g. company@ybl">
                        <small class="text-muted">कस्टमर को स्क्रीन पर दिखाने के लिए जनरल यूपीआई आईडी।</small>
                    </div>

                    <!-- 2. Paytm Merchant ID Field -->
                    <div class="form-group">
                        <label>Paytm Merchant ID (MID)</label>
                        <input type="text" name="paytm_merchant_id" class="form-control" 
                               value="<?= htmlspecialchars($contact['paytm_merchant_id'] ?? '') ?>" placeholder="Enter Paytm MID">
                        <small class="text-muted">Paytm Gateway के ज़रिये पेमेंट लेने के लिए MID।</small>
                    </div>

                    <!-- 3. UPI Gateway Merchant ID (EKQR) Field -->
                    <div class="form-group">
                        <label>UPI Gateway Merchant ID (EKQR API Key)</label>
                        <input type="text" name="upi_gateway_merchant_id" class="form-control" 
                               value="<?= htmlspecialchars($contact['upi_gateway_merchant_id'] ?? '') ?>" placeholder="Enter EKQR API token">
                        <small class="text-muted">EKQR.in से प्राप्त API key (ऑटोमैटिक QR कोड के लिए)।</small>
                    </div>

                    <div style="text-align: right; margin-top: 20px;">
                        <button type="submit" class="btn btn-success btn-lg">Save Settings</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## 4. User App Side Flow (यूज़र साइड पेमेंट फ्लो)

यह हिस्सा मोबाइल ऐप या यूजर की वेबसाइट पर पेमेंट करने के लिए कोड की व्याख्या करता है।

### A. `addfund.php` (Amount UI)
यूजर को अमाउंट इनपुट करने के लिए एक सुन्दर फॉर्म दिखाता है।

```html
<!-- File Location: app/addfund.php -->
<?php
require '../admin/conn/db.php';
// एडमिन सेटिंग्स से लिमिट लोड करें
$settings = $conn->query("SELECT min_deposit, max_deposit FROM admin_settings LIMIT 1")->fetch_assoc();
$minDeposit = (int) ($settings['min_deposit'] ?? 100);
$maxDeposit = (int) ($settings['max_deposit'] ?? 10000);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Points</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://code.jquery.com/jquery-3.7.1.js"></script>
    <script src="https://unpkg.com/sweetalert/dist/sweetalert.min.js"></script>
</head>
<body style="background: #1c1c1c; color: #fff;">
    <div class="container py-5" style="max-width: 450px;">
        <div class="card bg-dark text-white p-4 border-secondary">
            <h4 class="text-center text-danger mb-4">DEPOSIT WALLET</h4>
            <div class="d-flex justify-content-between mb-3 text-muted">
                <span>Minimum: ₹<?= $minDeposit ?></span>
                <span>Maximum: ₹<?= $maxDeposit ?></span>
            </div>
            
            <form method="post" action="initiate_payment.php" id="depositForm">
                <div class="mb-3">
                    <label class="form-label">Enter Amount (₹)</label>
                    <input type="number" name="txnAmount" id="amount" class="form-control bg-secondary text-white border-0" placeholder="0.00" required>
                </div>
                <button type="submit" class="btn btn-danger w-100 py-3 font-weight-bold">NEXT STEP</button>
            </form>
        </div>
    </div>

    <script>
        document.getElementById('depositForm').addEventListener('submit', function (e) {
            const amount = parseInt(document.getElementById('amount').value);
            const min = <?= $minDeposit ?>;
            const max = <?= $maxDeposit ?>;

            if (isNaN(amount) || amount < min || amount > max) {
                e.preventDefault();
                swal({
                    title: "Invalid Amount",
                    text: "Please enter amount between ₹" + min + " and ₹" + max,
                    icon: "warning",
                    button: "OK",
                });
            }
        });
    </script>
</body>
</html>
```

---

### B. `initiate_payment.php` (Order Creation)
यहाँ से गेटवे को रिक्वेस्ट जाती है। सर्वर साइड वैलिडेशन के बाद ट्रांजेक्शन पहले DB में इंसर्ट होता है फिर यूजर को QR स्क्रीन पर रीडायरेक्ट कर दिया जाता है।

```php
<!-- File Location: app/initiate_payment.php -->
<?php
session_start();
date_default_timezone_set('Asia/Kolkata');
require '../admin/conn/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $amount = isset($_POST['txnAmount']) ? trim($_POST['txnAmount']) : '';

    // बेसिक अमाउंट चेक
    if (!is_numeric($amount) || $amount < 10) {
        die("Invalid Amount. Must be >= 10");
    }

    $user_id = $_SESSION['user_id'] ?? null;
    if (!$user_id) {
        die("Error: User session not active. Please log in.");
    }

    $amount = floatval($amount);
    $client_txn_id = (string) rand(100000, 999999); // यूनिक मर्चेंट ट्रांजेक्शन आईडी
    $txn_date = date('d-m-Y'); // वर्तमान तारीख

    // रीडायरेक्शन यूआरएल जो पेमेंट होने के बाद ऑटोमैटिक यूजर को इस पेज पर लाएगा
    $scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $redirect_url = "$scheme://$host/app/payment_callback.php?txn_date=$txn_date&client_txn_id=$client_txn_id";

    // 1. डेटाबेस से EKQR API Key फ़ेच करें
    $settings = $conn->query("SELECT upi_gateway_merchant_id FROM contact_settings LIMIT 1")->fetch_assoc();
    $gateway_key = $settings['upi_gateway_merchant_id'] ?? '';

    if (empty($gateway_key)) {
        die("Payment gateway settings are missing in Admin Panel.");
    }

    // 2. डेटाबेस में ट्रांजेक्शन पेंडिंग (Pending) मार्क करके रिकॉर्ड बनाएं
    $date = date('Y-m-d H:i:s');
    $stmt = $conn->prepare("INSERT INTO deposits (user_id, amount, client_txn_id, status, date) VALUES (?, ?, ?, 'Pending', ?)");
    $stmt->bind_param("idss", $user_id, $amount, $client_txn_id, $date);
    $stmt->execute();
    $stmt->close();

    // 3. EKQR API पेलोड तैयार करें
    $payload = [
        "key" => $gateway_key,
        "client_txn_id" => $client_txn_id,
        "amount" => (string)$amount,
        "p_info" => "Wallet Deposit",
        "customer_name" => "User Account",
        "customer_email" => "user@gmail.com",
        "customer_mobile" => "9999999999",
        "redirect_url" => $redirect_url,
        "txn_date" => $txn_date,
        "udf1" => (string)$user_id
    ];

    // cURL के ज़रिए EKQR API को POST रिक्वेस्ट भेजें
    $ch = curl_init("https://api.ekqr.in/api/create_order");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    $response = curl_exec($ch);
    $result = json_decode($response, true);
    curl_close($ch);

    // 4. अगर रिस्पॉन्स सही है तो गेटवे के पेमेंट पेज पर भेजें (जहाँ QR कोड और UPI ऐप्स दिखेंगे)
    if ($result['status'] === true && isset($result['data']['payment_url'])) {
        header("Location: " . $result['data']['payment_url']);
        exit;
    } else {
        die("Error from API: " . ($result['msg'] ?? 'Gateway is not responding.'));
    }
} else {
    die("Request Method not allowed.");
}
?>
```

---

### C. `payment_callback.php` (Auto-Verification)
यूजर जब भुगतान कर देता है, तो गेटवे उसे वापस इस पेज पर भेजता है। सुरक्षा के लिहाज से यह फ़ाइल बिना गेटवे के स्टेटस चेक API वेरिफ़ाई किए बिना वॉलेट अपडेट नहीं करती।

```php
<!-- File Location: app/payment_callback.php -->
<?php
session_start();
require '../admin/conn/db.php';

$logFile = "callback_debug.txt";

$client_txn_id = $_GET['client_txn_id'] ?? '';
$txn_date = $_GET['txn_date'] ?? '';

// डीबगिंग के लिए रिस्पॉन्स लॉग करें
file_put_contents($logFile, "Redirect Hook Triggered: ClientTxnId=$client_txn_id, TxnDate=$txn_date\n", FILE_APPEND);

if (empty($client_txn_id) || empty($txn_date)) {
    exit("Invalid Callback Parameters.");
}

// 1. डेटाबेस से ट्रांजेक्शन फेच करें
$stmt = $conn->prepare("SELECT user_id, amount, status FROM deposits WHERE client_txn_id = ?");
$stmt->bind_param("s", $client_txn_id);
$stmt->execute();
$stmt->bind_result($user_id, $amount, $existing_status);
$stmt->fetch();
$stmt->close();

// अगर ट्रांजेक्शन पहले ही क्रेडिट/प्रोसेस्ड है तो होम पेज भेज दें
if (!$user_id || $existing_status === 'Completed') {
    header("Location: index.php");
    exit;
}

// 2. एडमिन से EKQR Key निकालें
$settings = $conn->query("SELECT upi_gateway_merchant_id FROM contact_settings LIMIT 1")->fetch_assoc();
$gateway_key = $settings['upi_gateway_merchant_id'] ?? '';

// 3. पेमेंट स्टेटस वेरिफ़ाई करने के लिए EKQR 'check_order_status' API कॉल करें (सबसे महत्वपूर्ण सुरक्षा)
$verify_url = "https://api.ekqr.in/api/check_order_status";
$payload = [
    "key" => $gateway_key,
    "client_txn_id" => $client_txn_id,
    "txn_date" => $txn_date
];

$ch = curl_init($verify_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($payload));
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$result = json_decode($response, true);

// 4. अगर रिस्पॉन्स 'success' देता है
if (
    $http_code === 200 &&
    isset($result['status']) && $result['status'] === true &&
    isset($result['data']['status']) &&
    strtolower($result['data']['status']) === 'success'
) {
    // 5% डिपॉज़िट बोनस अगर अमाउंट ₹100 या उससे अधिक है
    $bonus = ($amount >= 100) ? round($amount * 0.05, 2) : 0;
    $totalCredit = $amount + $bonus;

    // डेटाबेस ट्रांसैक्शन शुरू करें
    $conn->begin_transaction();
    try {
        // वॉलेट बैलेंस बढ़ाएं
        $stmt1 = $conn->prepare("UPDATE user SET wallet_balance = wallet_balance + ? WHERE id = ?");
        $stmt1->bind_param("di", $totalCredit, $user_id);
        $stmt1->execute();
        $stmt1->close();

        // ट्रांजेक्शन स्टेटस अपडेट करें
        $stmt2 = $conn->prepare("UPDATE deposits SET status = 'Completed' WHERE client_txn_id = ?");
        $stmt2->bind_param("s", $client_txn_id);
        $stmt2->execute();
        $stmt2->close();

        $conn->commit();
        file_put_contents($logFile, "✅ Transaction Completed. Credited ₹$totalCredit to UID $user_id\n", FILE_APPEND);
    } catch (Exception $e) {
        $conn->rollback();
        file_put_contents($logFile, "❌ DB Rollback occurred: " . $e->getMessage() . "\n", FILE_APPEND);
    }
} else {
    // पेमेंट फ़ेल या कैंसल होने पर
    $stmt = $conn->prepare("UPDATE deposits SET status = 'Failed' WHERE client_txn_id = ? AND status = 'Pending'");
    $stmt->bind_param("s", $client_txn_id);
    $stmt->execute();
    $stmt->close();
    file_put_contents($logFile, "❌ Order Status: Payment Failed/Rejected.\n", FILE_APPEND);
}

// होमपेज वापस भेजें
header("Location: index.php");
exit;
?>
```

---

### D. `verify_pending_deposits.php` (Pending Reconciliation)
अगर किसी कारण से पेमेंट करते वक्त इंटरनेट चला जाये या पेज बंद हो जाये, तो यूजर का स्टेटस डेटाबेस में `Pending` ही रह जाता है। इस फ़ाइल को होम स्क्रीन पर AJAX या Cron से कॉल करा सकते हैं जो खुद-ब-खुद स्टेटस दोबारा चेक कर पेंडिंग क्लियर कर देगा।

```php
<!-- File Location: app/verify_pending_deposits.php -->
<?php
session_start();
require '../admin/conn/db.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$user_id = $_SESSION['user_id'];
$settings = $conn->query("SELECT upi_gateway_merchant_id FROM contact_settings LIMIT 1")->fetch_assoc();
$gateway_key = $settings['upi_gateway_merchant_id'] ?? '';

$updated = false;

if (!empty($gateway_key)) {
    // पेंडिंग डिपॉजिट लिस्ट लाएं
    $pendingTxns = $conn->query("SELECT id, amount, client_txn_id, DATE_FORMAT(date, '%d-%m-%Y') as txn_date 
                                 FROM deposits 
                                 WHERE user_id = $user_id AND status = 'Pending'");

    if ($pendingTxns && $pendingTxns->num_rows > 0) {
        while ($txn = $pendingTxns->fetch_assoc()) {
            
            $payload = [
                "key" => $gateway_key,
                "client_txn_id" => $txn['client_txn_id'],
                "txn_date" => $txn['txn_date']
            ];

            // चेक स्टेटस API
            $ch = curl_init("https://api.ekqr.in/api/check_order_status");
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($payload));
            $response = curl_exec($ch);
            curl_close($ch);

            $resultData = json_decode($response, true);

            // अगर पेमेंट बाद में सक्सेस हो गयी थी तो वॉलेट बढ़ाएं
            if (
                isset($resultData['status']) && $resultData['status'] === true &&
                isset($resultData['data']['status']) &&
                strtolower($resultData['data']['status']) === 'success'
            ) {
                $bonus = ($txn['amount'] >= 100) ? round($txn['amount'] * 0.05, 2) : 0;
                $totalCredit = $txn['amount'] + $bonus;

                $conn->begin_transaction();
                try {
                    $stmt = $conn->prepare("UPDATE user SET wallet_balance = wallet_balance + ? WHERE id = ?");
                    $stmt->bind_param("di", $totalCredit, $user_id);
                    $stmt->execute();
                    $stmt->close();

                    $stmt = $conn->prepare("UPDATE deposits SET status = 'Completed' WHERE id = ?");
                    $stmt->bind_param("i", $txn['id']);
                    $stmt->execute();
                    $stmt->close();

                    $conn->commit();
                    $updated = true;
                } catch (Exception $e) {
                    $conn->rollback();
                }
            }
        }
    }
}

echo json_encode(['success' => true, 'updated' => $updated]);
?>
```

---

## 5. Security & Verification Checklist (सुरक्षा और सावधानियां)

डेवलपर के लिए पेमेंट लगाते समय ध्यान देने योग्य अत्यंत महत्वपूर्ण बातें:

1. **Client-side Verification पर विश्वास न करें:**
   * कभी भी यूजर के पास से आने वाले डेटा (जैसे `status = success`) को सीधे डेटाबेस में अपडेट न करें। सर्वर-टू-सर्वर एपीआई (`check_order_status`) ही एकमात्र तरीका होना चाहिए यह पुष्टि करने का कि पेमेंट सचमुच प्राप्त हुआ है या नहीं।
2. **Transaction ID का यूनिक होना:**
   * `client_txn_id` हमेशा हर आर्डर के लिए यूनिक होना चाहिए। अगर एक ही ID बार-बार भेजी जाएगी, तो गेटवे एरर देगा।
3. **Database Transaction (Atomicity):**
   * जब वॉलेट बैलेंस बढ़ाया जाए और डिपॉज़िट का स्टेटस `Completed` किया जाए, तब हमेशा `begin_transaction()` और `commit()` ब्लॉक का उपयोग करें। यह सुनिश्चित करता है कि सर्वर क्रैश होने पर कभी भी आधा काम न हो (जैसे स्टेटस पेंडिंग ही रह गया और वॉलेट में पैसा जुड़ गया या इसके विपरीत)।
4. **Log Checks:**
   * डीबगिंग के लिए हमेशा `callback_debug.txt` जैसी फ़ाइलों में रिस्पॉन्स लॉग करें ताकि लाइव सर्वर पर होने वाली समस्याओं को खोजा जा सके।