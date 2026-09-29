import { User } from '../models/User.js';

export const seedDefaultAdmin = async () => {
  try {
    // 1. Seed or Update Admin Account
    let admin = await User.findOne({ email: 'admin@shahlajuk.com' });
    if (!admin) {
      await User.create({
        name: 'Admin Master (ShahLajuk)',
        email: 'admin@shahlajuk.com',
        phone: '+8801700000000',
        address: 'ShahLajuk HQ, Gulshan-2, Dhaka',
        password: 'adminpassword',
        role: 'ADMIN',
        isVerified: true,
        status: 'Approved'
      });
      console.log('👑 Default Admin Account seeded (admin@shahlajuk.com)');
    }

    // 2. Seed or Update Demo User 1 (Tanvir Hasan)
    let user1 = await User.findOne({ email: 'tanvir@gmail.com' });
    if (!user1) {
      await User.create({
        name: 'Tanvir Hasan',
        email: 'tanvir@gmail.com',
        phone: '+8801712345678',
        address: 'House 42, Road 11, Banani, Dhaka',
        password: 'password123',
        role: 'USER',
        isVerified: true,
        status: 'Approved'
      });
      console.log('👤 Demo User Account seeded (tanvir@gmail.com)');
    }

    // 3. Seed or Update Demo User 2 (Hafiz Al Asad)
    let user2 = await User.findOne({ email: 'hkkhan074@gmail.com' });
    if (!user2) {
      await User.create({
        name: 'Hafiz Al Asad',
        email: 'hkkhan074@gmail.com',
        phone: '+8801645272591',
        address: 'Rishipara, Kakabo, Birulia - Akran',
        password: 'Hafiz@slfm',
        role: 'USER',
        isVerified: true,
        status: 'Approved'
      });
      console.log('👤 Demo User Account seeded (hkkhan074@gmail.com)');
    }
  } catch (error) {
    console.error('⚠️ Seeding error:', error.message);
  }
};
