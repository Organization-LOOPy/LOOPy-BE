// hash.js
import bcrypt from 'bcryptjs';

const plainPassword = '1234';
const saltRounds = 10;

bcrypt.hash(plainPassword, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }
  console.log('bcrypt hash:', hash);
});
