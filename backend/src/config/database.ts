import mongoose from 'mongoose';
import { env } from './env';

export async function connectDatabase() {
  if (!env.mongoUri) {
    throw new Error('MongoDB connection string is missing.');
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  console.log('MongoDB connected');
}
