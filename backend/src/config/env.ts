import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'changeme',
  mpAccessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
  mpPointDeviceId: process.env.MERCADO_PAGO_POINT_DEVICE_ID || '',
  mpSandbox: process.env.MERCADO_PAGO_SANDBOX !== 'false',
  adminBootstrapSecret: process.env.ADMIN_BOOTSTRAP_SECRET || '',

  // White-label
  brandName: process.env.BRAND_NAME || 'Asyncx',
  brandDomain: process.env.BRAND_DOMAIN || 'asyncx.com',
  paymentDescription: process.env.PAYMENT_DESCRIPTION || 'Pagamento',
  payerLastName: process.env.PAYER_LAST_NAME || 'Cliente',
  botUserAgent: process.env.BOT_USER_AGENT || 'AsyncxBot/1.0',
};

if (!env.mongoUri) {
  console.warn('MONGODB_URI not set. Update your .env before running the server.');
}

if (!env.mpAccessToken) {
  console.warn('MERCADO_PAGO_ACCESS_TOKEN not set. Configure it to enable payment integration.');
}
