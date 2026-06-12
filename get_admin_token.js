/**
 * Get Admin Token Script
 * Creates a test admin and returns JWT token
 */

const mongoose = require('mongoose');
const User = require('./src/models/user.model');
const config = require('./src/config/env');
const { generateToken } = require('./src/utils/generateToken');

async function getAdminToken() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    await mongoose.connect(config.mongoUri);
    console.log('✅ MongoDB connected');

    // Check if test admin exists
    let admin = await User.findOne({ email: 'admin@ludo.test', isAdmin: true });

    if (!admin) {
      console.log('📝 Creating test admin user...');
      
      const randomPhone = `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`;
      
      admin = new User({
        phone: randomPhone,
        name: 'Test Admin',
        email: 'admin@ludo.test',
        isAdmin: true,
        coins: 10000,
      });

      await admin.save();
      console.log('✅ Test admin created');
    } else {
      console.log('✅ Test admin already exists');
    }

    // Generate token
    const token = generateToken(admin._id, { isAdmin: true });

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ADMIN TOKEN GENERATED');
    console.log('='.repeat(60));
    console.log(`\nUser ID: ${admin._id}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Phone: ${admin.phone}`);
    console.log(`\nToken:\n${token}`);
    console.log('\n' + '='.repeat(60));
    console.log('\n📋 Usage Instructions:');
    console.log('1. Copy the token above');
    console.log('2. Open test_admin_apis_advanced.js');
    console.log('3. Replace the adminToken variable with the token above');
    console.log('4. Run: node test_admin_apis_advanced.js');
    console.log('\n📮 Or use in Postman:');
    console.log('Authorization Header: Bearer <paste_token_here>');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getAdminToken();
