import api from './api';

export interface NfceItem {
  descricao: string;
  codigo: string | null;
  quantidade: number | null;
  unidade: string | null;
  valorUnitario: number | null;
  valorTotal: number | null;
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  eanComercial: string | null;
  eanTributavel?: string | null;
  unidadeTributavel?: string | null;
  quantidadeTributavel?: number | null;
  icms: {
    baseCalculo: number | null;
    aliquota: number | null;
    valor: number | null;
    cst?: string | null;
    csosn?: string | null;
    icmsStRetido?: number | null;
    fcpStRetido?: number | null;
    icmsEfetivo?: number | null;
    baseStRetida?: number | null;
    percReducaoBaseEfetiva?: number | null;
    aliquotaEfetiva?: number | null;
  };
  pis: {
    baseCalculo: number | null;
    aliquota: number | null;
    valor: number | null;
    cst?: string | null;
  };
  cofins: {
    baseCalculo: number | null;
    aliquota: number | null;
    valor: number | null;
    cst?: string | null;
  };
  valorAproxTributos?: number | null;
  valorDescontoItem?: number | null;
  valorFreteItem?: number | null;
  valorSeguroItem?: number | null;
}

export interface NfcePagamento {
  forma: string | null;
  valorPago: number | null;
  troco: number | null;
}

export interface NfceTotais {
  quantidadeItens: number | null;
  valorTotal: number | null;
  desconto: number | null;
  valorAPagar: number | null;
  tributos: number | null;
  pagamento: NfcePagamento;
}

export interface NfceEmitente {
  nome: string | null;
  cnpj: string | null;
  endereco: string | null;
}

export interface NfceInfo {
  numero: string | null;
  serie: string | null;
  emissao: string | null;
  protocolo: string | null;
  ambiente: string | null;
  versaoXml: string | null;
  versaoXslt: string | null;
}

export interface NfceConsumidor {
  cpf: string | null;
  nome: string | null;
}

export interface NfceData {
  emitente: NfceEmitente;
  itens: NfceItem[];
  totais: NfceTotais;
  info: NfceInfo;
  chaveAcesso: string | null;
  chaveAcessoNumerica: string | null;
  consumidor: NfceConsumidor;
}

export async function fetchNfce(url: string) {
  const response = await api.get<NfceData>('/nfce', { params: { url } });
  return response.data;
}

export async function fetchFiscalOverview() {
  const response = await api.get('/nfce/fiscal');
  return response.data as {
    purchases: any[];
    sales: { sale: any; items: any[] }[];
    nfces: any[];
  };
}

export async function exportFiscalSummary(params?: { from?: string; to?: string }) {
  const response = await api.get('/nfce/fiscal/export', {
    params,
    responseType: 'blob',
  });
  return response.data as Blob;
}
