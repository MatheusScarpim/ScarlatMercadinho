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
   icms: {
     baseCalculo: number | null;
     aliquota: number | null;
     valor: number | null;
   };
   pis: {
     baseCalculo: number | null;
     aliquota: number | null;
     valor: number | null;
   };
   cofins: {
     baseCalculo: number | null;
     aliquota: number | null;
     valor: number | null;
   };
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
