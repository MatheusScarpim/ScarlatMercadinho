export const PERMISSIONS = [
  { key: 'DASHBOARD', label: 'Dashboard' },
  { key: 'PRODUCTS', label: 'Produtos' },
  { key: 'EXPIRING_PRODUCTS', label: 'Vencimentos' },
  { key: 'CATEGORIES', label: 'Categorias' },
  { key: 'UNITS', label: 'Unidades' },
  { key: 'SUPPLIERS', label: 'Fornecedores' },
  { key: 'PURCHASES', label: 'Compras' },
  { key: 'STOCK_MOVEMENTS', label: 'Movimentações' },
  { key: 'SALES', label: 'Vendas' },
  { key: 'LOCATIONS', label: 'Locais' },
  { key: 'SETTINGS', label: 'Configurações' },
  { key: 'NFC_E', label: 'NFC-e' },
  { key: 'FISCAL', label: 'Fiscal' }
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]['key'];

export const ALL_PERMISSIONS: PermissionKey[] = PERMISSIONS.map((p) => p.key);

export function permissionLabel(key: PermissionKey) {
  return PERMISSIONS.find((p) => p.key === key)?.label || key;
}
