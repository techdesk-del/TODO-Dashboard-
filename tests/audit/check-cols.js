const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '../../.env.local');
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const uri = env.match(/MONGODB_URI=(.*)/)[1].trim().replace(/^['"]|['"]$/g, '');

mongoose.connect(uri).then(async () => {
  const cols = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections in DB:', cols.map(c => c.name));
  await mongoose.disconnect();
});
