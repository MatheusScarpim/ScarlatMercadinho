import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'changeme'
};

if (!env.mongoUri) {
  console.warn('MONGODB_URI not set. Update your .env before running the server.');
}
