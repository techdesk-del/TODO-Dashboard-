const mongoose = require('mongoose');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const uri = env.match(/MONGODB_URI=(.*)/)[1].trim().replace(/^['"]|['"]$/g, '');

mongoose.connect(uri).then(async () => {
  const cols = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections in DB:', cols.map(c => c.name));
  await mongoose.disconnect();
});
