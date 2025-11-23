# Mercadinho do Condomínio – Autoatendimento e Painel Admin

Sistema completo de autoatendimento (quiosque) e painel administrativo para gestão de estoque, compras, produtos e vendas.

## Stack
- **Backend:** Node.js, TypeScript, Express, MongoDB/Mongoose, JWT, Bcrypt, CORS, dotenv.
- **Frontend:** Vue 3 (Vite, Composition API), TypeScript, Vue Router, Pinia, Axios, Chart.js (vue-chartjs).

## Estrutura
- `backend/`
  - Config: `.env`, `src/config/*`
  - Models: Users, Units, Suppliers, Categories, Products, Purchases, Sales, SaleItems, StockMovements, Notifications
- Pagamentos internos (Mercado Pago): `POST /payments/sales/:saleId` (method: `PIX`, `CREDIT_CARD`, `DEBIT_CARD`), `GET /payments/status/:paymentId`
  - Controllers/Services/Routes: auth, products, units, categories, suppliers, purchases, sales, stock-movements, notifications, metrics
- Pagamentos internos (Mercado Pago): `POST /payments/sales/:saleId` (method: `PIX`, `CREDIT_CARD`, `DEBIT_CARD`), `GET /payments/status/:paymentId`
  - Middlewares: auth (JWT), error handler
- `frontend/`
  - Páginas: `KioskView` (autoatendimento), `Login`, admin (`Dashboard`, `Products`, `Units`, `Categories`, `Suppliers`, `Purchases`, `StockMovements`, `Sales`)
  - stores: `auth`, `kiosk`, `notifications`
- Pagamentos internos (Mercado Pago): `POST /payments/sales/:saleId` (method: `PIX`, `CREDIT_CARD`, `DEBIT_CARD`), `GET /payments/status/:paymentId`
  - componentes: `BaseModal`

## Backend
### Pré-requisitos
- Node 18+
- MongoDB rodando (use o `docker-compose.yml` se quiser: `docker compose up -d mongo`)

### .env
Crie `backend/.env` a partir de `.env.example`:
```
MONGODB_URI=mongodb://root:root@localhost:27017/mercadinho?authSource=admin
JWT_SECRET=supersecret
PORT=3000
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_POINT_DEVICE_ID=
MERCADO_PAGO_SANDBOX=true

```

### Instalar e rodar
```
cd backend
npm install
npm run dev
```
Seed inicial: admin@example.com / admin123

### Endpoints principais
- Auth: `POST /auth/login`
- Produtos: CRUD + `GET /products/barcode/:barcode`
- Compras (entries): `POST /purchases` (gera estoque), `GET /purchases`
- Vendas: carrinho/venda `POST /sales` + itens/complete/cancel
- Movimentações: `GET /stock-movements`, `POST /stock-movements` (ajustes)
- Métricas: `GET /metrics?from=...&to=...&status=COMPLETED`
- Notificações: `GET /notifications`, `/unread-count`, `PUT /mark-all-read`, `PUT /:id/read`
- Pagamentos internos (Mercado Pago): `POST /payments/sales/:saleId` (method: `PIX`, `CREDIT_CARD`, `DEBIT_CARD`), `GET /payments/status/:paymentId`

> Rotas admin exigem JWT no header Authorization: Bearer.

## Frontend
### .env
```
VITE_API_BASE_URL=http://localhost:3000
```

### Instalar e rodar
```
cd frontend
npm install
npm run dev
```
Abra `http://localhost:5173`.

### Telas
- **/kiosk**: autoatendimento (scanner de código de barras + digitar código, carrinho, pagamento)
- **/admin/login**: login admin
- **/admin/dashboard**: métricas (faturamento, vendas, itens, ticket, gráfico diário, pagamentos, top produtos)
- **/admin/products**: CRUD com filtros (busca, categoria, status) e edição inline
- **/admin/units, /admin/categories, /admin/suppliers**: CRUDs
- **/admin/purchases**: entradas com itens, calcula total e atualiza estoque
- **/admin/stock-movements**: histórico de entradas/saídas/ajustes
- **/admin/sales**: listagem paginada de vendas
- Notificações: botão no header do admin com painel (ler/marcar lidas)
- Pagamentos internos (Mercado Pago): `POST /payments/sales/:saleId` (method: `PIX`, `CREDIT_CARD`, `DEBIT_CARD`), `GET /payments/status/:paymentId`

## Padrões e observações
- Paginado: produtos e vendas já aceitam `page/limit`.
- Estoque: compras geram ENTRY, vendas completadas geram EXIT.
- Kiosk: leitor envia código + Enter; input oculto mantém foco.
- Tema: claro com acento verde/azulado; modais unificadas com `BaseModal`.

## Comandos úteis
- `docker compose up -d mongo` (subir Mongo)
- `npm run dev` (backend ou frontend, em seus diretórios)
- `npm run build` (frontend) / `npm run build` (backend transpila TS)

