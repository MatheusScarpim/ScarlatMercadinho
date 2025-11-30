import cron from 'node-cron';
import { BatchModel } from '../models/Batch';
import { Notification } from '../models/Notification';
import { notifyExpiringProduct, notifyExpiredProduct } from '../services/notificationService';

/**
 * Verifica se já existe notificação recente para este produto/local
 */
async function hasRecentNotification(
  productId: any,
  location: string,
  hours: number = 24
): Promise<boolean> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  const existingNotification = await Notification.findOne({
    relatedProduct: productId,
    location,
    type: { $in: ['EXPIRING_PRODUCT', 'EXPIRED_PRODUCT'] },
    createdAt: { $gte: cutoffDate }
  });

  return !!existingNotification;
}

async function deleteExistingNotifications(productId: any, location: string) {
  await Notification.deleteMany({
    relatedProduct: productId,
    location,
    type: { $in: ['EXPIRING_PRODUCT', 'EXPIRED_PRODUCT'] }
  });
}

/**
 * Calcula dias até o vencimento
 */
function calculateDaysUntilExpiry(expiryDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diff = expiry.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Verifica lotes e cria notificações para produtos próximos do vencimento
 */
export async function checkExpiringBatchesAndNotify() {
  try {
    console.log('[EXPIRY-JOB] Iniciando verificação de produtos próximos do vencimento...');

    // Busca lotes que vencem nos próximos 15 dias
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + 15);

    const batches = await BatchModel.find({
      expiryDate: { $lte: thresholdDate },
      quantity: { $gt: 0 }
    }).populate('product');

    let notificationsCreated = 0;

    for (const batch of batches) {
      if (!batch.product) continue;

      const product = batch.product as any;
      const daysUntilExpiry = calculateDaysUntilExpiry(batch.expiryDate);

      // se o lote não está mais próximo de vencer (ex.: reposição ou compra nova com validade maior), limpa notificações antigas
      if (daysUntilExpiry > 15) {
        await deleteExistingNotifications(product._id, batch.location);
        continue;
      }

      // Verifica se já existe notificação recente para evitar spam
      const hasRecent = await hasRecentNotification(
        product._id,
        batch.location,
        24 // Não notificar novamente nas últimas 24 horas
      );

      if (hasRecent) {
        continue;
      }

      // Cria notificação baseada na urgência
      if (daysUntilExpiry <= 0) {
        // Produto vencido
        await notifyExpiredProduct(
          product._id,
          product.name,
          batch.location,
          batch.quantity
        );
        notificationsCreated++;
        console.log(`[EXPIRY-JOB] Notificação criada: Produto VENCIDO - ${product.name}`);
      } else if (daysUntilExpiry <= 7) {
        // Produto vence em até 7 dias (crítico/urgente)
        await notifyExpiringProduct(
          product._id,
          product.name,
          daysUntilExpiry,
          batch.location,
          batch.quantity
        );
        notificationsCreated++;
        console.log(`[EXPIRY-JOB] Notificação criada: Produto vence em ${daysUntilExpiry} dia(s) - ${product.name}`);
      } else if (daysUntilExpiry <= 15) {
        // Produto vence em 8-15 dias (atenção) - notifica apenas uma vez quando entra nessa faixa
        await notifyExpiringProduct(
          product._id,
          product.name,
          daysUntilExpiry,
          batch.location,
          batch.quantity
        );
        notificationsCreated++;
        console.log(`[EXPIRY-JOB] Notificação criada: Produto vence em ${daysUntilExpiry} dia(s) - ${product.name}`);
      }
    }

    console.log(`[EXPIRY-JOB] Verificação concluída. ${notificationsCreated} notificações criadas.`);
  } catch (error: any) {
    console.error('[EXPIRY-JOB] Erro ao verificar produtos próximos do vencimento:', error.message);
  }
}

/**
 * Inicia o job agendado para rodar diariamente às 8h da manhã
 */
export function startExpiryNotificationJob() {
  // Executa todos os dias às 8h da manhã
  cron.schedule('0 8 * * *', async () => {
    console.log('[EXPIRY-JOB] Executando job agendado...');
    await checkExpiringBatchesAndNotify();
  });

  // Também executa imediatamente ao iniciar o servidor (apenas em desenvolvimento)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[EXPIRY-JOB] Executando verificação inicial...');
    setTimeout(() => {
      checkExpiringBatchesAndNotify();
    }, 5000); // Aguarda 5 segundos após o servidor iniciar
  }

  console.log('[EXPIRY-JOB] Job de notificação de vencimento configurado para rodar diariamente às 8h');
}
