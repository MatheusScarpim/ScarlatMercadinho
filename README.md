# Asyncx Market

Sistema completo de autoatendimento (quiosque) e painel administrativo para gestão de estoque, compras, produtos e vendas.

## Tecnologias

### Backend
- **Runtime:** Node.js
- **Linguagem:** TypeScript
- **Framework:** Express
- **Banco de dados:** MongoDB com Mongoose
- **Autenticação:** JWT e Bcrypt
- **Validação:** Zod
- **Pagamentos:** Mercado Pago SDK
- **Outros:** Puppeteer, PDFKit, node-cron, Multer

### Frontend
- **Framework:** Vue 3 (Composition API)
- **Build tool:** Vite
- **Linguagem:** TypeScript
- **Roteamento:** Vue Router
- **Estado:** Pinia
- **HTTP:** Axios
- **Gráficos:** Chart.js (vue-chartjs)
- **Outros:** jsQR (leitura de QR Code)

### Infraestrutura
- **Conteinerização:** Docker e Docker Compose
- **Proxy:** Nginx

## Estrutura do Projeto

```
backend/          # API REST (Express + TypeScript)
frontend/         # SPA (Vue 3 + Vite)
nginx/            # Configuração do proxy Nginx
docker-compose.yml
```

## Como Rodar

### Backend

```bash
cd backend
npm install
# Configure backend/.env a partir de .env.example
npm run dev
```

### Frontend

```bash
cd frontend
npm install
# Configure frontend/.env a partir de .env.example
npm run dev
```

### Docker (MongoDB)

```bash
docker compose up -d mongo
```
