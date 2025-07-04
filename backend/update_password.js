const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function updateUserPassword(userId, newPassword) {
  try {
    // Initialize database connection
    await db.initialize();
    
    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update the user's password
    const result = await db.run(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, userId]
    );
    
    if (result.changes === 0) {
      console.log(`❌ User with ID ${userId} not found`);
      return false;
    }
    
    // Get updated user info
    const user = await db.get('SELECT id, name, email FROM users WHERE id = ?', [userId]);
    
    console.log(`✅ Password updated successfully for user:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   New Password: ${newPassword}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error updating password:', error);
    return false;
  } finally {
    await db.close();
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.log('Usage: node update_password.js <userId> <newPassword>');
  console.log('Example: node update_password.js 1 mynewpassword');
  console.log('\nAvailable users:');
  
  // Show available users
  db.initialize().then(async () => {
    const users = await db.all('SELECT id, name, email FROM users');
    users.forEach(user => {
      console.log(`  ID: ${user.id} - ${user.name} (${user.email})`);
    });
    await db.close();
  });
  
  process.exit(1);
}

const userId = parseInt(args[0]);
const newPassword = args[1];

if (isNaN(userId)) {
  console.log('❌ User ID must be a number');
  process.exit(1);
}

if (newPassword.length < 6) {
  console.log('❌ Password must be at least 6 characters');
  process.exit(1);
}

// Update the password
updateUserPassword(userId, newPassword).then(success => {
  process.exit(success ? 0 : 1);
});
