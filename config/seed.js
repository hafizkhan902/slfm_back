import { User } from '../models/User.js';

export const seedDefaultAdmin = async () => {
  try {
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'ChangeMeAdmin2026!';
    const userPassword = process.env.SEED_USER_PASSWORD || 'ChangeMeUser2026!';

    // 1. Seed Default Admin Account if non-existent
    const admin = await User.findOne({ email: 'admin@shahlajuk.com' });
    if (!admin) {
      await User.create({
        name: 'Admin Master (ShahLajuk)',
        email: 'admin@shahlajuk.com',
        phone: '+8801700000000',
        address: 'ShahLajuk HQ, Gulshan-2, Dhaka',
        password: adminPassword,
        role: 'ADMIN',
        isVerified: true,
        status: 'Approved'
      });
    }

    // 2. Seed Default User Account if non-existent
    const user1 = await User.findOne({ email: 'tanvir@gmail.com' });
    if (!user1) {
      await User.create({
        name: 'Tanvir Hasan',
        email: 'tanvir@gmail.com',
        phone: '+8801712345678',
        address: 'House 42, Road 11, Banani, Dhaka',
        password: userPassword,
        role: 'USER',
        isVerified: true,
        status: 'Approved'
      });
    }
  } catch (error) {
    console.error('Seeding error:', error.message);
  }
};
