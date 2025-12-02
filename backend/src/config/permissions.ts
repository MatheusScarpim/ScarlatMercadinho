export const SCREEN_PERMISSIONS = [
  {
    key: 'DASHBOARD',
    label: 'Dashboard',
    description: 'Visão geral e métricas do negócio'
  },
  {
    key: 'PRODUCTS',
    label: 'Produtos',
    description: 'Cadastro, edição e preços de produtos'
  },
  {
    key: 'EXPIRING_PRODUCTS',
    label: 'Vencimentos',
    description: 'Monitoramento e ajustes de lotes próximos ao vencimento'
  },
  {
    key: 'CATEGORIES',
    label: 'Categorias',
    description: 'Organização de categorias de produtos'
  },
  {
    key: 'UNITS',
    label: 'Unidades',
    description: 'Cadastro e manutenção de unidades de medida'
  },
  {
    key: 'SUPPLIERS',
    label: 'Fornecedores',
    description: 'Gestão de fornecedores e dados de contato'
  },
  {
    key: 'PURCHASES',
    label: 'Compras',
    description: 'Lançamento e consulta de compras'
  },
  {
    key: 'STOCK_MOVEMENTS',
    label: 'Movimentações',
    description: 'Transferências e ajustes de estoque'
  },
  {
    key: 'SALES',
    label: 'Vendas',
    description: 'Consulta e exportação de vendas'
  },
  {
    key: 'LOCATIONS',
    label: 'Locais',
    description: 'Configuração de endereços e quiosques'
  },
  {
    key: 'SETTINGS',
    label: 'Configurações',
    description: 'Preferências gerais do sistema'
  },
  {
    key: 'NFC_E',
    label: 'NFC-e',
    description: 'Emissão e consulta de NFC-e'
  },
  {
    key: 'FISCAL',
    label: 'Fiscal',
    description: 'Visão fiscal e relatórios'
  }
] as const;

export type ScreenPermission = (typeof SCREEN_PERMISSIONS)[number]['key'];

export const ALL_PERMISSIONS: ScreenPermission[] = SCREEN_PERMISSIONS.map((p) => p.key);

export function isValidPermission(value: unknown): value is ScreenPermission {
  return typeof value === 'string' && (ALL_PERMISSIONS as readonly string[]).includes(value);
}

/**
 * Limpa e deduplica a lista enviada pelo cliente garantindo que só permissões conhecidas sejam persistidas.
 * Quando nenhum valor é enviado, retorna o fallback informado (pode ser vazio).
 */
export function normalizePermissions(
  value: unknown,
  fallback: ScreenPermission[] = []
): ScreenPermission[] {
  if (!Array.isArray(value)) return [...fallback];
  const unique = new Set<ScreenPermission>();
  for (const item of value) {
    if (isValidPermission(item)) {
      unique.add(item);
    }
  }
  return Array.from(unique);
}
