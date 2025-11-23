import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'changeme',
  mpAccessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
  mpPointDeviceId: process.env.MERCADO_PAGO_POINT_DEVICE_ID || '',
  mpSandbox: process.env.MERCADO_PAGO_SANDBOX !== 'false'
};

if (!env.mongoUri) {
  console.warn('MONGODB_URI not set. Update your .env before running the server.');
}

if (!env.mpAccessToken) {
  console.warn('MERCADO_PAGO_ACCESS_TOKEN not set. Configure it to enable payment integration.');
}
