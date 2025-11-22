import { Request, Response } from 'express';
import { SaleModel } from '../models/Sale';
import { SaleItemModel } from '../models/SaleItem';

export async function getOverview(req: Request, res: Response) {
  const { from, to, status } = req.query;
  const match: any = {};
  const saleStatus = typeof status === 'string' ? status.toUpperCase() : 'COMPLETED';
  match.status = saleStatus;
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from as string);
    if (to) match.createdAt.$lte = new Date(to as string);
  }

  const [salesAgg] = await SaleModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$totalAmount' },
        salesCount: { $sum: 1 },
        itemsSold: { $sum: '$totalItems' }
      }
    }
  ]);

  const daily = await SaleModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: '$totalAmount' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const payments = await SaleModel.aggregate([
    { $match: match },
    { $group: { _id: '$paymentMethod', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
  ]);

  const productMatch: any = { 'sale.status': saleStatus };
  if (from || to) {
    productMatch['sale.createdAt'] = {};
    if (from) productMatch['sale.createdAt'].$gte = new Date(from as string);
    if (to) productMatch['sale.createdAt'].$lte = new Date(to as string);
  }

  const topProducts = await SaleItemModel.aggregate([
    {
      $lookup: {
        from: 'sales',
        localField: 'sale',
        foreignField: '_id',
        as: 'sale'
      }
    },
    { $unwind: '$sale' },
    { $match: productMatch },
    {
      $group: {
        _id: '$product',
        quantity: { $sum: '$quantity' },
        total: { $sum: '$total' }
      }
    },
    { $sort: { quantity: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $project: {
        _id: 0,
        id: '$product._id',
        name: '$product.name',
        quantity: 1,
        total: 1
      }
    }
  ]);

  const revenue = salesAgg?.revenue || 0;
  const salesCount = salesAgg?.salesCount || 0;
  const itemsSold = salesAgg?.itemsSold || 0;
  const avgTicket = salesCount ? revenue / salesCount : 0;

  res.json({
    revenue,
    salesCount,
    itemsSold,
    avgTicket,
    daily,
    payments,
    topProducts
  });
}
