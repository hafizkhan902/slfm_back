import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI ;

  try {
    const conn = await mongoose.connect(mongoUri, {
      maxPoolSize: 50,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 4000
    });

    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Primary Connection Error: ${error.message}`);
    if (mongoUri.includes('mongodb+srv')) {
      try {
        console.log('🔄 Retrying connection with local MongoDB instance (mongodb://127.0.0.1:27017/shahlajuk_db)...');
        const conn = await mongoose.connect('mongodb://127.0.0.1:27017/shahlajuk_db', {
          serverSelectionTimeoutMS: 3000
        });
        console.log(`🍃 Local MongoDB Connected: ${conn.connection.host}`);
      } catch (localErr) {
        console.warn('⚠️ Local MongoDB fallback unavailable:', localErr.message);
      }
    }
  }
};
