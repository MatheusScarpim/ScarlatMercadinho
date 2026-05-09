# Painel Administrativo – Asyncx Market

## Acesso

### Credenciais padrão (seed)
- **E-mail:** admin@example.com
- **Senha:** admin123

> Altere a senha após o primeiro login. O seed é executado automaticamente na primeira inicialização do backend.

### URL
- **Frontend admin:** `http://localhost:5173/admin/login`
- **API base:** `http://localhost:3000`

---

## Módulos do Admin

### Dashboard (`/admin/dashboard`)
- Faturamento, vendas, itens vendidos e ticket médio do período
- Gráfico diário de vendas (últimos 7 dias)
- Top produtos mais vendidos
- Distribuição por forma de pagamento

### Produtos (`/admin/products`)
- CRUD completo com filtros por nome, categoria e status
- Edição inline de campos
- Visualização por código de barras
- Ativação/desativação de produtos

### Unidades (`/admin/units`)
- Gerenciamento de unidades de medida (kg, un, l, etc.)

### Categorias (`/admin/categories`)
- Gerenciamento de categorias de produtos

### Fornecedores (`/admin/suppliers`)
- Cadastro e gerenciamento de fornecedores

### Compras (`/admin/purchases`)
- Registro de entrada de produtos com itens
- Cálculo automático do total
- Atualização automática do estoque ao finalizar

### Movimentações de Estoque (`/admin/stock-movements`)
- Histórico completo de entradas (ENTRY), saídas (EXIT) e ajustes (ADJUSTMENT)
- Ajuste manual de estoque

### Vendas (`/admin/sales`)
- Listagem paginada de vendas realizadas
- Detalhes de itens, forma de pagamento e status

---

## API – Endpoints Administrativos

Todas as rotas abaixo exigem autenticação via JWT no header:

```
Authorization: Bearer <token>
```

### Autenticação
| Método | Rota              | Descrição          |
|--------|-------------------|--------------------|
| POST   | `/auth/login`     | Login do admin     |

### Produtos
| Método | Rota                         | Descrição                      |
|--------|------------------------------|--------------------------------|
| GET    | `/products`                  | Listar produtos (paginado)     |
| GET    | `/products/:id`              | Obter produto por ID           |
| GET    | `/products/barcode/:barcode` | Buscar por código de barras    |
| POST   | `/products`                  | Criar produto                  |
| PUT    | `/products/:id`              | Atualizar produto              |
| DELETE | `/products/:id`              | Remover produto                |

### Compras
| Método | Rota          | Descrição                   |
|--------|---------------|-----------------------------|
| GET    | `/purchases`  | Listar compras              |
| POST   | `/purchases`  | Registrar compra (gera ENTRY no estoque) |

### Vendas
| Método | Rota                                          | Descrição                        |
|--------|-----------------------------------------------|----------------------------------|
| GET    | `/sales`                                      | Listar vendas (paginado)         |
| POST   | `/sales`                                      | Criar venda (carrinho)           |
| PUT    | `/sales/:id/complete`                         | Finalizar venda (gera EXIT)      |
| PUT    | `/sales/:id/cancel`                           | Cancelar venda                   |

### Movimentações de Estoque
| Método | Rota                | Descrição                               |
|--------|---------------------|-----------------------------------------|
| GET    | `/stock-movements`  | Histórico de movimentações              |
| POST   | `/stock-movements`  | Criar ajuste manual de estoque          |

### Métricas
| Método | Rota                                           | Descrição                  |
|--------|-------------------------------------------------|----------------------------|
| GET    | `/metrics?from=&to=&status=COMPLETED`           | Métricas do dashboard      |

### Notificações
| Método | Rota                     | Descrição                       |
|--------|--------------------------|---------------------------------|
| GET    | `/notifications`         | Listar notificações             |
| GET    | `/notifications/unread-count` | Contagem de não lidas      |
| PUT    | `/notifications/mark-all-read` | Marcar todas como lidas   |
| PUT    | `/notifications/:id/read`    | Marcar notificação como lida |

### Unidades, Categorias, Fornecedores
| Método | Rota                      | Descrição            |
|--------|---------------------------|----------------------|
| GET    | `/units`                  | Listar unidades      |
| POST   | `/units`                  | Criar unidade        |
| PUT    | `/units/:id`              | Atualizar unidade    |
| DELETE | `/units/:id`              | Remover unidade      |
| GET    | `/categories`             | Listar categorias    |
| POST   | `/categories`             | Criar categoria      |
| PUT    | `/categories/:id`         | Atualizar categoria  |
| DELETE | `/categories/:id`         | Remover categoria    |
| GET    | `/suppliers`              | Listar fornecedores  |
| POST   | `/suppliers`              | Criar fornecedor     |
| PUT    | `/suppliers/:id`          | Atualizar fornecedor |
| DELETE | `/suppliers/:id`          | Remover fornecedor   |

### Pagamentos (Mercado Pago)
| Método | Rota                                  | Descrição                     |
|--------|---------------------------------------|-------------------------------|
| POST   | `/payments/sales/:saleId`             | Iniciar pagamento (PIX/CREDIT_CARD/DEBIT_CARD) |
| GET    | `/payments/status/:paymentId`         | Consultar status do pagamento |

---

## Fluxos Administrativos

### Gestão de Estoque
1. **Compra (ENTRY):** Ao registrar uma compra, o estoque é automaticamente incrementado.
2. **Venda (EXIT):** Ao finalizar uma venda, o estoque é automaticamente decrementado.
3. **Ajuste manual (ADJUSTMENT):** Use o endpoint `POST /stock-movements` para corrigir divergências.

### Notificações
- O sistema gera notificações para eventos como estoque baixo, vendas concluídas, etc.
- O painel admin exibe um contador de não lidas no header.
- É possível marcar notificações como lidas individualmente ou em massa.

---

## Variáveis de Ambiente (Backend)

| Variável                        | Descrição                          | Padrão                                           |
|---------------------------------|------------------------------------|--------------------------------------------------|
| `MONGODB_URI`                   | String de conexão MongoDB          | `mongodb://root:root@localhost:27017/mercadinho?authSource=admin` |
| `JWT_SECRET`                    | Chave secreta para tokens JWT      | `supersecret`                                    |
| `PORT`                          | Porta do servidor                  | `3000`                                           |
| `MERCADO_PAGO_ACCESS_TOKEN`     | Token de acesso Mercado Pago       | —                                                |
| `MERCADO_PAGO_POINT_DEVICE_ID`  | ID do dispositivo Mercado Pago     | —                                                |
| `MERCADO_PAGO_SANDBOX`          | Modo sandbox Mercado Pago          | `true`                                           |

## Variáveis de Ambiente (Frontend)

| Variável             | Descrição                | Padrão                     |
|----------------------|--------------------------|----------------------------|
| `VITE_API_BASE_URL`  | URL base da API backend  | `http://localhost:3000`    |

---

## Comandos Úteis

```bash
# Subir MongoDB
docker compose up -d mongo

# Iniciar backend (desenvolvimento)
cd backend && npm run dev

# Iniciar frontend (desenvolvimento)
cd frontend && npm run dev

# Build frontend
cd frontend && npm run build

# Build backend (transpilar TypeScript)
cd backend && npm run build
```

---

## Considerações

- **Autenticação:** Todas as rotas admin exigem token JWT válido no header `Authorization`.
- **Paginação:** Os endpoints de listagem (`/products`, `/sales`) suportam os parâmetros `page` e `limit`.
- **Mercado Pago:** Os pagamentos internos suportam as modalidades PIX, cartão de crédito e cartão de débito. Em sandbox, utilize o token de teste do Mercado Pago.
- **Tema:** O painel admin utiliza tema claro com acentos verde/azulado e modais unificadas com o componente `BaseModal`.
