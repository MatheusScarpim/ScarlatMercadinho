# Painel Administrativo — Asyncx Market

## Visão Geral

O painel administrativo do Asyncx Market permite a gestão completa do sistema: produtos, estoque, vendas, compras, usuários, configurações e mais. O acesso é feito via `http://localhost:5173/admin/login`.

## Perfis de Acesso

| Perfil  | Descrição                                                                 |
|---------|---------------------------------------------------------------------------|
| ADMIN   | Acesso irrestrito a todas as telas e operações. Não pode ser desativado.  |
| STAFF   | Acesso limitado às telas conforme permissões configuradas pelo admin.     |

### Permissões por Tela (STAFF)

As permissões granulares controlam quais telas um usuário STAFF pode acessar:

| Chave               | Tela             | Descrição                                        |
|----------------------|------------------|--------------------------------------------------|
| DASHBOARD            | Dashboard        | Visão geral e métricas do negócio                |
| PRODUCTS             | Produtos         | Cadastro, edição e preços de produtos            |
| EXPIRING_PRODUCTS    | Vencimentos      | Monitoramento e ajustes de lotes próximos ao vencimento |
| CATEGORIES           | Categorias       | Organização de categorias de produtos            |
| UNITS                | Unidades         | Cadastro e manutenção de unidades de medida      |
| SUPPLIERS            | Fornecedores     | Gestão de fornecedores e dados de contato        |
| PURCHASES            | Compras          | Lançamento e consulta de compras                 |
| STOCK_MOVEMENTS      | Movimentações    | Transferências e ajustes de estoque              |
| SALES                | Vendas           | Consulta e exportação de vendas                  |
| LOCATIONS            | Locais           | Configuração de endereços e quiosques            |
| SETTINGS             | Configurações    | Preferências gerais do sistema                   |
| NFC_E                | NFC-e            | Emissão e consulta de NFC-e                      |
| FISCAL               | Fiscal           | Visão fiscal e relatórios                        |

Usuários ADMIN possuem todas as permissões automaticamente; as regras de permissão aplicam-se apenas a STAFF.

## Telas do Admin

### Dashboard (`/admin/dashboard`)
- Métricas de faturamento, vendas, itens vendidos e ticket médio
- Gráfico diário de vendas
- Ranking de métodos de pagamento
- Top produtos mais vendidos
- Filtro por período (data inicial/final)

### Produtos (`/admin/products`)
- CRUD completo com cadastro, edição e exclusão
- Filtros por busca textual, categoria e status
- Edição inline de campos
- Upload de imagens
- Controle de estoque por lote

### Categorias (`/admin/categories`)
- CRUD de categorias para organização de produtos

### Unidades (`/admin/units`)
- CRUD de unidades de medida (kg, un, cx, etc.)

### Fornecedores (`/admin/suppliers`)
- CRUD com dados de contato e informações cadastrais

### Compras (`/admin/purchases`)
- Lançamento de compras com múltiplos itens
- Cálculo automático do total
- Geração automática de movimentação de entrada (ENTRY) no estoque

### Movimentações de Estoque (`/admin/stock-movements`)
- Histórico completo de movimentações
- Tipos: ENTRY (entrada), EXIT (saída), ADJUSTMENT (ajuste manual)
- Visualização do saldo atual por produto

### Vendas (`/admin/sales`)
- Listagem paginada de vendas realizadas
- Detalhes dos itens vendidos e forma de pagamento
- Geração automática de movimentação de saída (EXIT) no estoque ao completar

### Locais (`/admin/locations`)
- Configuração de quiosques e endereços
- Senha de acesso ao quiosque (configurável via `VITE_LOCATION_PASSWORD`)

### Configurações (`/admin/settings`)
- Preferências gerais do sistema (white-label)
- Configuráveis via variáveis de ambiente:
  - `BRAND_NAME` — Nome da marca (exibido na interface)
  - `BRAND_DOMAIN` — Domínio da marca
  - `PAYMENT_DESCRIPTION` — Descrição exibida no pagamento
  - `PAYER_LAST_NAME` — Sobrenome do pagador
  - `PIX_DEFAULT_CPF` — CPF padrão para PIX

### Usuários (`/admin/users`)
- Gerenciamento de usuários do sistema
- Criação, edição, desativação e consulta
- Definição de perfil (ADMIN ou STAFF)
- Configuração de permissões granulares por usuário STAFF
- Regras de segurança:
  - ADMIN não pode ser desativado
  - Um usuário não pode desativar a si mesmo
  - Senha deve ter no mínimo 6 caracteres
  - E-mail deve ser único

### NFC-e (`/admin/nfce`)
- Emissão e consulta de Nota Fiscal ao Consumidor Eletrônica

### Fiscal (`/admin/fiscal`)
- Relatórios e visão fiscal do negócio

### Chat (`/admin/chat`)
- Comunicação interna com clientes do quiosque

## Autenticação e Autorização

### Login
```
POST /auth/login
Body: { email, password }
Response: { token, user: { id, name, email, role, permissions, passwordMustChange } }
```

### Bootstrap (primeiro admin)
```
POST /auth/bootstrap-admin
Body: { name, email, password, secret }
```
O `secret` deve corresponder ao valor de `ADMIN_BOOTSTRAP_SECRET` no `.env`.  
Cria o primeiro usuário ADMIN quando não houver nenhum.

### Troca de senha
```
POST /auth/change-password
Headers: Authorization: Bearer <token>
Body: { currentPassword, newPassword }
```

### Middleware de Autorização

- `authMiddleware` — Verifica JWT, carrega dados do usuário (role + permissions), rejeita usuários inativos.
- `adminOnly` — Bloqueia requisições de usuários que não são ADMIN.
- `requirePermission(perm)` — Bloqueia requisições de STAFF sem a permissão específica. ADMIN sempre passa.

## API — Usuários (Admin-only)

Todas as rotas exigem `authMiddleware` + `adminOnly`.

| Método | Rota                          | Descrição                     |
|--------|-------------------------------|-------------------------------|
| POST   | `/users`                      | Criar usuário                 |
| GET    | `/users`                      | Listar usuários               |
| GET    | `/users/permissions/options`  | Listar opções de permissão    |
| GET    | `/users/:id`                  | Obter usuário por ID          |
| PUT    | `/users/:id`                  | Atualizar usuário             |
| DELETE | `/users/:id`                  | Desativar usuário (soft-delete) |

## API — Demais Recursos

Todas exigem JWT no header `Authorization: Bearer <token>`.  
Consulte o `README.md` para a lista completa de endpoints.

## Variáveis de Ambiente (Admin)

### Backend (.env)
| Variável                     | Descrição                                  |
|------------------------------|--------------------------------------------|
| `MONGODB_URI`                | String de conexão do MongoDB               |
| `JWT_SECRET`                 | Chave secreta para assinatura de tokens    |
| `PORT`                       | Porta do servidor (padrão: 3000)          |
| `ADMIN_BOOTSTRAP_SECRET`     | Segredo para criação do primeiro admin     |
| `MERCADO_PAGO_ACCESS_TOKEN`  | Token de acesso Mercado Pago               |
| `MERCADO_PAGO_POINT_DEVICE_ID` | ID do device point Mercado Pago         |
| `MERCADO_PAGO_SANDBOX`       | Modo sandbox (padrão: true)                |
| `BRAND_NAME`                 | Nome da marca (white-label)                |
| `BRAND_DOMAIN`               | Domínio da marca                           |
| `PAYMENT_DESCRIPTION`        | Descrição do pagamento                     |
| `PAYER_LAST_NAME`            | Sobrenome do pagador                       |
| `PIX_DEFAULT_CPF`            | CPF padrão para PIX                        |
| `BOT_USER_AGENT`             | User-Agent do bot (AsyncxBot/1.0)          |

### Frontend (.env)
| Variável                  | Descrição                            |
|---------------------------|--------------------------------------|
| `VITE_API_BASE_URL`       | URL base da API (padrão: http://localhost:3000) |
| `VITE_LOCATION_PASSWORD`  | Senha de acesso ao quiosque          |

## Docker

O arquivo `docker-compose.yml` orquestra três serviços:

- **mongo** — MongoDB 7 na porta `27018`
- **backend** — API Node.js na porta `4000`
- **frontend** — App Vue 3 (Nginx) na porta `5173`

### Comandos úteis

```bash
# Subir apenas o MongoDB
docker compose up -d mongo

# Subir toda a stack
docker compose up -d

# Ver logs
docker compose logs -f backend
```

## Seed Inicial

Após configurar o banco e rodar o backend pela primeira vez, utilize o endpoint de bootstrap para criar o admin inicial:

```bash
curl -X POST http://localhost:3000/auth/bootstrap-admin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "admin@example.com",
    "password": "admin123",
    "secret": "<seu ADMIN_BOOTSTRAP_SECRET>"
  }'
```

Credenciais padrão (seed): `admin@example.com` / `admin123`

## Segurança

- Tokens JWT são exigidos em todas as rotas administrativas
- Senhas armazenadas com bcrypt (hash)
- ADMIN não pode ser desativado via API
- STAFF não pode criar/altera/desativar outros usuários (rota admin-only)
- Usuário não pode desativar a si mesmo
- Autodesativação bloqueada no backend
- Permissões inválidas são ignoradas silenciosamente no cadastro/atualização
- Validação de e-mail e tamanho mínimo de senha (6 caracteres)
