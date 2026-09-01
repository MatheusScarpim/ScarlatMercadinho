# Administração do Sistema — Asyncx Market

## Visão Geral

Sistema completo de autoatendimento (quiosque) e painel administrativo para gestão de estoque, compras, produtos e vendas.

- **Site pública (quiosque):** `http://<host>:5173/kiosk`
- **Painel admin:** `http://<host>:5173/admin/login`
- **API:** `http://<host>:4000`

---

## Stack

| Camada    | Tecnologia                                           |
|-----------|------------------------------------------------------|
| Backend   | Node.js, TypeScript, Express, MongoDB (Mongoose)     |
| Frontend  | Vue 3 (Vite, Composition API), TypeScript, Vue Router, Pinia, Axios, Chart.js |
| Proxy     | Nginx                                                |
| Banco     | MongoDB 7                                            |
| Pagamentos| Mercado Pago (PIX, CREDIT_CARD, DEBIT_CARD)          |
| Container | Docker / Docker Compose                              |

---

## Credenciais Padrão (Seed)

- **E-mail:** admin@example.com
- **Senha:** admin123

> Altere a senha após o primeiro acesso.

---

## Variáveis de Ambiente

### Backend (`backend/.env`)

| Variável                     | Descrição                                      | Padrão                         |
|------------------------------|------------------------------------------------|--------------------------------|
| `MONGODB_URI`                | String de conexão do MongoDB                   | `mongodb://root:root@localhost:27017/mercadinho?authSource=admin` |
| `JWT_SECRET`                 | Chave secreta para assinar tokens JWT          | `supersecret`                  |
| `PORT`                       | Porta do servidor Express                      | `4000`                         |
| `MERCADO_PAGO_ACCESS_TOKEN`  | Token de acesso Mercado Pago                   | *(vazio)*                      |
| `MERCADO_PAGO_POINT_DEVICE_ID` | ID do dispositivo Point                        | *(vazio)*                      |
| `MERCADO_PAGO_SANDBOX`       | Usar ambiente sandbox                          | `true`                         |
| `PAYMENTS_API_URL`           | URL interna da API para pagamentos             | `http://backend:4000/`         |
| `BRAND_NAME`                 | Nome da marca (white-label)                    | `Asyncx`                       |
| `BRAND_DOMAIN`               | Domínio da marca                               | `asyncx.com`                   |
| `PAYMENT_DESCRIPTION`        | Descrição padrão do pagamento                  | `Pagamento`                    |
| `PAYER_LAST_NAME`            | Sobrenome padrão do pagador                    | `Cliente`                      |
| `BOT_USER_AGENT`             | User-Agent do bot interno                      | `AsyncxBot/1.0`                |
| `COSMOS_API_TOKEN`           | Token Cosmos (Bluesoft) para dados por EAN     | *(vazio)*                      |
| `SERPAPI_KEY`                | Chave SerpAPI para fallback de preço           | *(vazio)*                      |

### Frontend (`frontend/.env`)

| Variável                | Descrição                       | Padrão                     |
|-------------------------|---------------------------------|----------------------------|
| `VITE_API_BASE_URL`     | URL base da API                  | `http://localhost:3000`    |
| `VITE_LOCATION_PASSWORD`| Senha da localização (quiosque)  | `1234`                     |

---

## Docker Compose

```bash
# Subir apenas o MongoDB
docker compose up -d mongo

# Subir tudo (MongoDB + Backend + Frontend)
docker compose up -d

# Parar tudo
docker compose down

# Ver logs
docker compose logs -f backend
docker compose logs -f frontend
```

### Portas expostas

| Serviço  | Porta Host | Porta Container |
|----------|-----------|-----------------|
| MongoDB  | 27018     | 27017           |
| Backend  | 4000      | 4000            |
| Frontend | 5173      | 80              |

---

## Nginx (Produção)

Dois arquivos de configuração em `nginx/`:

- `api-market.asyncx.com.br` — proxy reverso para a API (backend)
- `market.asyncx.com.br` — proxy reverso para o frontend

Ative com `ln -s` para `sites-enabled` no Nginx do servidor.

---

## Endpoints da API

### Autenticação

| Método | Rota          | Descrição                     |
|--------|---------------|-------------------------------|
| POST   | `/auth/login` | Login (retorna JWT)           |

### Administrativo (requer JWT `Authorization: Bearer <token>`)

| Método | Rota                        | Descrição                     |
|--------|-----------------------------|-------------------------------|
| CRUD   | `/products`                 | Gerenciar produtos            |
| GET    | `/products/barcode/:barcode`| Buscar produto por código     |
| CRUD   | `/categories`               | Gerenciar categorias          |
| CRUD   | `/units`                    | Gerenciar unidades            |
| CRUD   | `/suppliers`                | Gerenciar fornecedores        |
| CRUD   | `/users`                    | Gerenciar usuários            |
| POST   | `/purchases`                | Registrar compra (gera estoque)|
| GET    | `/purchases`                | Listar compras                |
| POST   | `/sales`                    | Registrar venda               |
| POST   | `/stock-movements`          | Ajuste manual de estoque      |
| GET    | `/stock-movements`          | Histórico de movimentações    |
| GET    | `/metrics`                  | Métricas e dashboard          |
| GET    | `/notifications`            | Listar notificações           |
| PUT    | `/notifications/:id/read`   | Marcar notificação como lida  |
| PUT    | `/notifications/mark-all-read` | Marcar todas como lidas   |
| GET    | `/locations`                | Gerenciar localizações        |
| CRUD   | `/batches`                  | Gerenciar lotes               |
| CRUD   | `/customers`                | Gerenciar clientes            |
| GET/POST| `/chat`                    | Chat interno                  |
| GET/PUT| `/settings`                 | Configurações do sistema      |
| POST   | `/payments/sales/:saleId`   | Iniciar pagamento (PIX/CREDIT_CARD/DEBIT_CARD) |
| GET    | `/payments/status/:paymentId` | Status do pagamento          |
| GET    | `/nfce`                     | NFC-e (Nota Fiscal)           |
| GET    | `/cosmos`                   | Consulta Cosmos (Bluesoft)    |

### Quiosque (público)

| Método | Rota        | Descrição                     |
|--------|-------------|-------------------------------|
| GET    | `/kiosks`   | Dados do quiosque             |

---

## Manutenção

### Backup do MongoDB

```bash
docker exec asyncx-mongo mongodump --username root --password root --authenticationDatabase admin --db mercadinho --out /tmp/backup
docker cp asyncx-mongo:/tmp/backup ./backup-mongodb-$(date +%Y%m%d)
```

### Restore

```bash
docker cp ./backup-mongodb-YYYYMMDD asyncx-mongo:/tmp/backup
docker exec asyncx-mongo mongorestore --username root --password root --authenticationDatabase admin --drop /tmp/backup
```

### Logs e Monitoramento

```bash
# Logs do backend
docker compose logs -f --tail=100 backend

# Logs do banco
docker compose logs -f --tail=100 mongo

# Status dos containers
docker compose ps
```

---

## Pagamentos (Mercado Pago)

1. Obtenha `MERCADO_PAGO_ACCESS_TOKEN` no painel do Mercado Pago (Integrações > Credenciais)
2. Obtenha `MERCADO_PAGO_POINT_DEVICE_ID` no aplicativo Mercado Pago Point (ou pelo integrador)
3. Configure `MERCADO_PAGO_SANDBOX=true` para testes
4. A maquininha é configurada automaticamente no modo PDV na inicialização do backend

> **Importante:** Para ambiente real, altere `MERCADO_PAGO_SANDBOX=false` e utilize tokens de produção.

---

## Cosmos API (Bluesoft)

Para consulta de produtos por código de barras (EAN):

1. Cadastre-se em [Bluesoft Cosmos](https://cosmos.bluesoft.com.br/)
2. Gere um token de acesso
3. Defina `COSMOS_API_TOKEN` no `.env` do backend

---

## White Label

O sistema suporta personalização de marca via variáveis de ambiente:

- `BRAND_NAME` — Nome exibido na interface
- `BRAND_DOMAIN` — Domínio utilizado
- `PAYMENT_DESCRIPTION` — Descrição que aparece no extrato do pagamento

---

## Jobs Automatizados

O backend executa automaticamente na inicialização:

- **Migração de lotes:** Adiciona `originalSalePrice` em lotes antigos
- **Configuração da maquininha:** Configura o dispositivo Point no modo PDV
- **Notificação de vencimento:** Job periódico que notifica produtos próximos do vencimento

---

## Estrutura de Diretórios

```
/
├── backend/
│   ├── src/
│   │   ├── config/         # Conexão DB, env, logger
│   │   ├── controllers/    # Lógica dos endpoints
│   │   ├── errors/         # Classes de erro
│   │   ├── jobs/           # Jobs agendados
│   │   ├── middlewares/    # Auth, error handler
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # Definição de rotas
│   │   ├── scripts/        # Scripts utilitários
│   │   ├── services/       # Lógica de negócio
│   │   ├── utils/          # Utilitários
│   │   └── server.ts       # Entry point
│   └── uploads/            # Uploads de arquivos
├── frontend/
│   ├── src/
│   │   ├── components/     # Componentes Vue
│   │   ├── pages/          # Páginas (Kiosk, Admin/*)
│   │   ├── stores/         # Pinia stores
│   │   └── ...
│   └── index.html
├── nginx/                  # Configurações de proxy
├── docker-compose.yml
└── admin.md
```

---

## Troubleshooting

### Erro de conexão com MongoDB

Verifique se o container do MongoDB está rodando:

```bash
docker compose ps mongo
docker compose logs mongo
```

### Erro 401 nas rotas admin

- Certifique-se de que o token JWT está sendo enviado no header `Authorization: Bearer <token>`
- O token pode ter expirado — faça login novamente

### Maquininha não conecta

- Verifique `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_POINT_DEVICE_ID`
- Confirme se o dispositivo Point está pareado e na mesma rede
- Em sandbox, a maquininha pode não funcionar — teste apenas com `SANDBOX=false`

### Frontend não conecta à API

- Verifique `VITE_API_BASE_URL`
- Confirme se o backend está acessível na porta configurada
- Verifique as configurações de CORS no backend
