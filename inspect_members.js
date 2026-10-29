const mongoose = require('mongoose');
async function run() {
  await mongoose.connect('mongodb+srv://techdesk_db_user:aakash@cluster0.vgpa6s7.mongodb.net/urbangaon_todo?retryWrites=true&w=majority&appName=Cluster0');
  const users = await mongoose.connection.collection('users').find({}).toArray();
  console.log('USERS COUNT:', users.length);
  users.forEach(u => {
    console.log(`id: "${u.id}", name: "${u.name}", email: "${u.email}", role: "${u.role}", desig: "${u.designation}", dept: "${u.department}", manager: "${u.manager}"`);
  });
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
