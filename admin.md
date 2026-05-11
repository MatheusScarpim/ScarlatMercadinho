# Documentação Administrativa — ScarlatMercadinho

> Painel administrativo do sistema Asyncx Market para gestão de estoque, vendas, produtos e operações do mercadinho.

---

## Acesso ao Painel Admin

- **URL:** `http://localhost:5173/admin/login` (desenvolvimento)
- **Credencial padrão (seed):** `admin@example.com` / `admin123`

> Todas as rotas admin exigem JWT no header `Authorization: Bearer <token>`.

---

## Módulos Administrativos

### Dashboard (`/admin/dashboard`)
Visão geral com métricas do negócio:
- Faturamento (período)
- Quantidade de vendas
- Itens vendidos
- Ticket médio
- Gráfico diário de vendas
- Distribuição de pagamentos
- Top produtos mais vendidos
- Filtro por período (`from` / `to`)

### Produtos (`/admin/products`)
CRUD completo com:
- Cadastro, edição inline e exclusão de produtos
- Filtros por busca textual, categoria e status
- Controle de preço de venda e custo
- Código de barras por produto
- Lotes com data de validade (ver módulo Vencimentos)

### Vencimentos (`/admin/expiring-products`)
Monitoramento de lotes próximos ao vencimento:
- Listagem de produtos com lotes perto de expirar
- Ajustes de estoque para remoção de lotes vencidos
- Notificações automáticas para produtos na iminência do vencimento

### Categorias (`/admin/categories`)
Organização de categorias de produtos.

### Unidades (`/admin/units`)
Cadastro e manutenção de unidades de medida (kg, un, cx, etc.).

### Fornecedores (`/admin/suppliers`)
Gestão de fornecedores com dados de contato.

### Compras (`/admin/purchases`)
Lançamento de entrada de mercadorias:
- Adição de itens com quantidade e preço
- Cálculo automático do total da compra
- Geração automática de movimentação de estoque (`ENTRY`)

### Movimentações de Estoque (`/admin/stock-movements`)
Histórico completo de movimentações:
- `ENTRY`: gerada por compras
- `EXIT`: gerada por vendas completadas
- `ADJUSTMENT`: ajustes manuais de estoque
- Filtros por tipo, produto e período

### Vendas (`/admin/sales`)
Consulta de vendas realizadas:
- Listagem paginada (`page` / `limit`)
- Filtros por status e período
- Visualização de itens da venda
- Exportação de dados

### Locais (`/admin/locations`)
Configuração de endereços e quiosques (pontos de venda).

### Configurações (`/admin/settings`)
Preferências gerais do sistema:
- Nome fantasia do estabelecimento
- CNPJ
- Inscrição estadual
- Regras de negócio (NFC-e, etc.)

### NFC-e (`/admin/nfce`)
Emissão e consulta de Nota Fiscal de Consumidor Eletrônica.

### Fiscal (`/admin/fiscal`)
Visão fiscal com relatórios e acompanhamento de obrigações acessórias.

### Chat (`/admin/chat`)
Comunicação interna com suporte a mensagens entre operadores.

### Usuários (`/admin/users`)
Gestão de usuários administradores com controle de permissões por tela.

---

## Permissões por Tela

O sistema possui controle de acesso baseado em permissões individuais por módulo:

| Chave                | Tela              | Descrição                                   |
|----------------------|-------------------|---------------------------------------------|
| `DASHBOARD`          | Dashboard         | Visão geral e métricas do negócio           |
| `PRODUCTS`           | Produtos          | Cadastro, edição e preços de produtos       |
| `EXPIRING_PRODUCTS`  | Vencimentos       | Monitoramento de lotes próximos ao vencimento |
| `CATEGORIES`         | Categorias        | Organização de categorias                   |
| `UNITS`              | Unidades          | Cadastro de unidades de medida              |
| `SUPPLIERS`          | Fornecedores      | Gestão de fornecedores                      |
| `PURCHASES`          | Compras           | Lançamento e consulta de compras            |
| `STOCK_MOVEMENTS`    | Movimentações     | Transferências e ajustes de estoque         |
| `SALES`              | Vendas            | Consulta e exportação de vendas             |
| `LOCATIONS`          | Locais            | Configuração de endereços e quiosques       |
| `SETTINGS`           | Configurações     | Preferências gerais do sistema              |
| `NFC_E`              | NFC-e             | Emissão e consulta de NFC-e                 |
| `FISCAL`             | Fiscal            | Visão fiscal e relatórios                   |

---

## Endpoints da API (Admin)

Todas as rotas administrativas exigem autenticação JWT.

### Autenticação
| Método | Rota          | Descrição          |
|--------|---------------|--------------------|
| POST   | `/auth/login` | Login de operador  |

### Produtos
| Método | Rota                        | Descrição                |
|--------|-----------------------------|--------------------------|
| GET    | `/products`                 | Listar produtos          |
| GET    | `/products/:id`             | Obter produto            |
| POST   | `/products`                 | Criar produto            |
| PUT    | `/products/:id`             | Atualizar produto        |
| DELETE | `/products/:id`             | Excluir produto          |
| GET    | `/products/barcode/:barcode`| Buscar por código de barras |

### Compras
| Método | Rota          | Descrição                    |
|--------|---------------|------------------------------|
| GET    | `/purchases`  | Listar compras               |
| POST   | `/purchases`  | Criar compra (gera estoque)  |

### Vendas
| Método | Rota                          | Descrição              |
|--------|-------------------------------|------------------------|
| GET    | `/sales`                      | Listar vendas          |
| POST   | `/sales`                      | Criar venda (carrinho) |
| PUT    | `/sales/:id/complete`         | Completar venda        |
| PUT    | `/sales/:id/cancel`           | Cancelar venda         |

### Estoque
| Método | Rota                | Descrição                     |
|--------|---------------------|-------------------------------|
| GET    | `/stock-movements`  | Listar movimentações          |
| POST   | `/stock-movements`  | Criar ajuste manual           |

### Métricas
| Método | Rota                                  | Descrição              |
|--------|---------------------------------------|------------------------|
| GET    | `/metrics?from=...&to=...&status=COMPLETED` | Métricas do dashboard |

### Notificações
| Método | Rota                   | Descrição                |
|--------|------------------------|--------------------------|
| GET    | `/notifications`       | Listar notificações      |
| GET    | `/notifications/unread-count` | Contagem de não lidas |
| PUT    | `/notifications/mark-all-read` | Marcar todas lidas |
| PUT    | `/notifications/:id/read` | Marcar uma como lida  |

### Pagamentos (Mercado Pago)
| Método | Rota                                   | Descrição              |
|--------|----------------------------------------|------------------------|
| POST   | `/payments/sales/:saleId`              | Iniciar pagamento      |
| GET    | `/payments/status/:paymentId`          | Consultar status       |

> Métodos de pagamento suportados: `PIX`, `CREDIT_CARD`, `DEBIT_CARD`.

### Demais CRUDs
- **Categorias:** `GET/POST/PUT/DELETE /categories`
- **Unidades:** `GET/POST/PUT/DELETE /units`
- **Fornecedores:** `GET/POST/PUT/DELETE /suppliers`
- **Usuários:** `GET/POST/PUT/DELETE /users`
- **Locais:** `GET/POST/PUT/DELETE /locations`
- **Configurações:** `GET/PUT /settings`
- **NFC-e:** `GET/POST /nfce`

---

## Tarefas Agendadas (Cron Jobs)

O backend utiliza `node-cron` para tarefas automáticas:
- **Atualização de preços:** script `refreshProducts` (executado sob demanda via `npm run refresh-products`)
- **Notificações de vencimento:** verificação periódica de lotes próximos ao vencimento

---

## Ambiente e Configuração

### Variáveis de ambiente (`backend/.env`)
```
MONGODB_URI=mongodb://root:root@localhost:27017/mercadinho?authSource=admin
JWT_SECRET=supersecret
PORT=3000
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_POINT_DEVICE_ID=
MERCADO_PAGO_SANDBOX=true
```

### Frontend (`frontend/.env`)
```
VITE_API_BASE_URL=http://localhost:3000
```

---

## Manutenção

### Subindo o ambiente
```bash
# Banco MongoDB
docker compose up -d mongo

# Backend (terminal 1)
cd backend
npm install
npm run dev

# Frontend (terminal 2)
cd frontend
npm install
npm run dev
```

### Seed inicial
O banco é populado automaticamente na primeira execução com:
- Usuário admin: `admin@example.com` / `admin123`
- Unidades, categorias e fornecedores padrão

### Build de produção
```bash
cd backend && npm run build     # Transpila TS → JS
cd frontend && npm run build    # Gera bundle Vite
```

---

## Notificações

O sistema dispara notificações administrativas para:
- Produtos com estoque baixo
- Lotes próximos ao vencimento
- Vendas concluídas com sucesso
- Erros em processamento de pagamentos

Notificações são acessíveis pelo botão no header do painel admin, com opção de marcar como lidas individualmente ou em massa.

---

## Observações

- **Estoque:** compras geram movimentação `ENTRY`; vendas completadas geram `EXIT`; ajustes manuais geram `ADJUSTMENT`.
- **Paginação:** endpoints de produtos e vendas aceitam parâmetros `page` e `limit`.
- **Tema:** claro com acento verde/azulado; modais unificadas com componente `BaseModal`.
- **Segurança:** todas as rotas admin são protegidas por middleware JWT + verificação de permissão por tela.
