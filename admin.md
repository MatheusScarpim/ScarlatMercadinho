# Admin – Asyncx Market

Documentação administrativa do sistema Asyncx Market (autoatendimento e painel admin).

---

## Acesso ao Painel Admin

| Campo        | Valor                                         |
|------------- |-----------------------------------------------|
| URL          | `http://localhost:5173/admin/login`           |
| Seed (dev)   | `admin@example.com` / `admin123`              |

> Em produção, substitua `localhost` pelo domínio configurado no nginx.

---

## Funcionalidades do Admin

### Dashboard (`/admin/dashboard`)
- Faturamento, total de vendas, itens vendidos, ticket médio
- Gráfico diário de vendas
- Distribuição por método de pagamento
- Top produtos mais vendidos

### Produtos (`/admin/products`)
- CRUD completo com filtros por busca, categoria e status
- Edição inline
- Cadastro por código de barras (EAN)
- Integração Cosmos API (Bluesoft) para lookup de produtos por EAN

### Unidades (`/admin/units`)
- CRUD de unidades de medida (ex.: kg, un, cx, lt)

### Categorias (`/admin/categories`)
- CRUD de categorias de produtos

### Fornecedores (`/admin/suppliers`)
- CRUD de fornecedores

### Compras (`/admin/purchases`)
- Entrada de mercadorias com itens
- Cálculo automático do total
- Geração automática de movimentação de estoque (ENTRY)

### Movimentações (`/admin/stock-movements`)
- Histórico completo de entradas, saídas e ajustes
- Registro manual de ajustes de estoque

### Vendas (`/admin/sales`)
- Listagem paginada de vendas realizadas
- Detalhes dos itens, forma de pagamento e status

### Notificações
- Botão no header do admin com painel de notificações
- Funcionalidade de marcar como lida / marcar todas como lidas
- Notificações de estoque baixo e outras alertas

---

## Stack

| Camada    | Tecnologia                                              |
|-----------|---------------------------------------------------------|
| Backend   | Node.js, TypeScript, Express, MongoDB/Mongoose          |
| Frontend  | Vue 3 (Vite, Composition API), TypeScript, Pinia, Axios |
| Auth      | JWT + Bcrypt                                            |
| Charts    | Chart.js (vue-chartjs)                                  |
| Gateway   | Nginx (proxy reverso)                                   |

---

## Configuração de Ambiente

### Backend (`backend/.env`)

```env
MONGODB_URI=mongodb://root:root@localhost:27017/mercadinho?authSource=admin
JWT_SECRET=supersecret
PORT=3000
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_POINT_DEVICE_ID=
MERCADO_PAGO_SANDBOX=true
PAYMENTS_API_URL=http://backend:4000/

# White-label (opcional)
BRAND_NAME=Asyncx
BRAND_DOMAIN=asyncx.com
PAYMENT_DESCRIPTION=Pagamento
PAYER_LAST_NAME=Cliente
BOT_USER_AGENT=AsyncxBot/1.0

# Cosmos API (Bluesoft) - lookup de produtos por EAN
COSMOS_API_TOKEN=

# SerpAPI - fallback de preço via Google Shopping
SERPAPI_KEY=
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:3000
```

---

## Deploy

### Docker (produção)

```bash
# Subir todos os serviços
VITE_API_BASE_URL=https://api.seudominio.com docker compose up -d

# Subir apenas o MongoDB
docker compose up -d mongo
```

O `docker-compose.yml` expõe:
- MongoDB na porta `27018` (host) / `27017` (container)
- Backend na porta `4000`
- Frontend na porta `5173` (nginx interno na 80)

### Manual (desenvolvimento)

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

---

## Scripts Úteis

| Comando                                    | Descrição                              |
|--------------------------------------------|----------------------------------------|
| `npm run dev` (backend)                    | Servidor dev com hot-reload            |
| `npm run build` (backend)                  | Compilar TypeScript                    |
| `npm run start` (backend)                  | Rodar servidor compilado               |
| `npm run lint` (backend)                   | ESLint                                 |
| `npm run build` (frontend)                 | Build para produção (Vite)             |
| `npm run refresh-products` (backend)       | Script de atualização em massa         |
| `docker compose up -d mongo`               | Subir MongoDB via Docker               |

---

## Endpoints da API

### Autenticação
| Método | Rota             | Descrição              |
|--------|------------------|------------------------|
| POST   | `/auth/login`    | Login admin            |

### Produtos
| Método | Rota                        | Descrição                    |
|--------|-----------------------------|------------------------------|
| GET    | `/products`                 | Listar (paginado)            |
| GET    | `/products/barcode/:codigo` | Buscar por código de barras  |
| POST   | `/products`                 | Criar                        |
| PUT    | `/products/:id`             | Atualizar                    |
| DELETE | `/products/:id`             | Remover                      |

### Vendas
| Método | Rota                | Descrição                  |
|--------|---------------------|----------------------------|
| POST   | `/sales`            | Criar venda (carrinho)     |
| GET    | `/sales`            | Listar (paginado)          |
| PUT    | `/sales/:id/complete` | Completar venda          |
| PUT    | `/sales/:id/cancel` | Cancelar venda             |

### Estoque
| Método | Rota                         | Descrição                |
|--------|------------------------------|--------------------------|
| GET    | `/stock-movements`           | Histórico                |
| POST   | `/stock-movements`           | Ajuste manual            |

### Pagamentos (Mercado Pago)
| Método | Rota                           | Descrição                |
|--------|--------------------------------|--------------------------|
| POST   | `/payments/sales/:saleId`      | Iniciar pagamento (PIX, CREDIT_CARD, DEBIT_CARD) |
| GET    | `/payments/status/:paymentId`  | Consultar status         |

### Métricas
| Método | Rota                                         | Descrição        |
|--------|----------------------------------------------|------------------|
| GET    | `/metrics?from=...&to=...&status=COMPLETED`  | Dashboard        |

### Notificações
| Método | Rota                       | Descrição                |
|--------|----------------------------|--------------------------|
| GET    | `/notifications`           | Listar                   |
| GET    | `/notifications/unread-count` | Total não lidas       |
| PUT    | `/notifications/mark-all-read` | Marcar todas lidas   |
| PUT    | `/notifications/:id/read`  | Marcar uma como lida     |

> Todas as rotas admin exigem header `Authorization: Bearer <token>`.

---

## Segurança

- **JWT** — tokens com Bcrypt para hash de senha. O secret `JWT_SECRET` deve ser alterado para um valor forte em produção.
- **CORS** — configurado no backend; ajustar origens permitidas conforme necessário.
- **Mercado Pago** — utilizar `MERCADO_PAGO_SANDBOX=false` em produção com token real.
- **MongoDB** — a porta 27018 no host não deve ser exposta publicamente; recomenda-se rede interna do Docker.

---

## Manutenção

### Backup do MongoDB

```bash
docker exec asyncx-mongo mongodump --username root --password root \
  --authenticationDatabase admin --db mercadinho \
  --out /data/backup/$(date +%Y%m%d_%H%M%S)
```

### Restore

```bash
docker exec asyncx-mongo mongorestore --username root --password root \
  --authenticationDatabase admin --db mercadinho \
  /data/backup/<diretorio_do_backup>/mercadinho
```

### Logs

```bash
docker logs asyncx-backend -f
docker logs asyncx-frontend -f
docker logs asyncx-mongo -f
```

---

## Troubleshooting

| Problema                          | Possível causa                          | Solução                                    |
|-----------------------------------|-----------------------------------------|--------------------------------------------|
| Backend não conecta ao MongoDB    | MongoDB não está rodando                | `docker compose up -d mongo`               |
| Frontend não conecta ao backend   | `VITE_API_BASE_URL` incorreto           | Verificar `.env` do frontend               |
| Erro 401 nas rotas admin          | Token JWT ausente ou expirado           | Reautenticar em `/admin/login`             |
| Pagamento não processa            | Mercado Pago não configurado            | Preencher `MERCADO_PAGO_ACCESS_TOKEN`      |
| Produto não encontrado por EAN    | Cosmos API sem token                    | Configurar `COSMOS_API_TOKEN`              |

---

## White-label

O sistema suporta personalização de marca via variáveis de ambiente:

| Variável            | Padrão     | Descrição              |
|---------------------|------------|------------------------|
| `BRAND_NAME`        | Asyncx     | Nome exibido na interface |
| `BRAND_DOMAIN`      | asyncx.com | Domínio da marca       |
| `PAYMENT_DESCRIPTION` | Pagamento | Descrição nos pagamentos |
| `PAYER_LAST_NAME`   | Cliente    | Sobrenome do pagador   |
| `BOT_USER_AGENT`    | AsyncxBot  | User-Agent do chatbot  |
