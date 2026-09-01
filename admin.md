# Painel Administrativo – Asyncx Market

## Acesso

1. Acesse `http://localhost:5173/admin/login`
2. Faça login com as credenciais de administrador
   - **Seed padrão:** admin@example.com / admin123
3. Todas as requisições às rotas admin exigem token JWT no header `Authorization: Bearer`

## Telas do Admin

### Dashboard (`/admin/dashboard`)
- Métricas gerais: faturamento, total de vendas, itens vendidos, ticket médio
- Gráfico diário de vendas
- Distribuição por forma de pagamento
- Top produtos mais vendidos no período
- Filtro por data (parâmetros `from` e `to`)

### Produtos (`/admin/products`)
- CRUD completo com cadastro de nome, descrição, preço, custo, código de barras, imagem e categoria
- Filtros: busca textual, filtro por categoria, filtro por status (ativo/inativo)
- Edição inline na tabela
- Visualização de estoque atual

### Unidades (`/admin/units`)
- CRUD de unidades de medida (kg, un, cx, pct, etc.)

### Categorias (`/admin/categories`)
- CRUD de categorias de produtos

### Fornecedores (`/admin/suppliers`)
- CRUD de fornecedores com dados de contato

### Compras / Entradas (`/admin/purchases`)
- Registro de compras com múltiplos itens
- Cada item informa: produto, quantidade, preço unitário
- Cálculo automático do total da compra
- Gera movimentação de estoque do tipo **ENTRY** ao finalizar

### Movimentações de Estoque (`/admin/stock-movements`)
- Histórico completo de entradas, saídas e ajustes manuais
- Tipo: `ENTRY` (entrada), `EXIT` (saída), `ADJUSTMENT` (ajuste)
- Permite registrar ajustes manuais de estoque

### Vendas (`/admin/sales`)
- Listagem paginada de vendas realizadas
- Visualização de itens, valores e status

### Notificações
- Botão no header do admin com contador de não lidas
- Painel lateral com listagem de notificações
- Ação para marcar como lida / marcar todas como lidas

## Rotas da API (Admin)

Todas as rotas abaixo exigem token JWT.

### Autenticação
- `POST /auth/login` – Login do admin

### Produtos
- `GET /products` – Listar produtos (paginado)
- `GET /products/barcode/:barcode` – Buscar por código de barras
- `GET /products/:id` – Detalhes do produto
- `POST /products` – Criar produto
- `PUT /products/:id` – Atualizar produto
- `DELETE /products/:id` – Excluir produto

### Unidades
- `GET /units` – Listar unidades
- `POST /units` – Criar unidade
- `PUT /units/:id` – Atualizar unidade
- `DELETE /units/:id` – Excluir unidade

### Categorias
- `GET /categories` – Listar categorias
- `POST /categories` – Criar categoria
- `PUT /categories/:id` – Atualizar categoria
- `DELETE /categories/:id` – Excluir categoria

### Fornecedores
- `GET /suppliers` – Listar fornecedores
- `POST /suppliers` – Criar fornecedor
- `PUT /suppliers/:id` – Atualizar fornecedor
- `DELETE /suppliers/:id` – Excluir fornecedor

### Compras
- `GET /purchases` – Listar compras (paginado)
- `POST /purchases` – Criar compra (gera ENTRY no estoque)

### Vendas
- `GET /sales` – Listar vendas (paginado)
- `POST /sales` – Criar venda (carrinho)
- `GET /sales/:id` – Detalhes da venda
- `PUT /sales/:id/complete` – Finalizar venda (gera EXIT no estoque)
- `PUT /sales/:id/cancel` – Cancelar venda

### Movimentações de Estoque
- `GET /stock-movements` – Listar movimentações
- `POST /stock-movements` – Criar ajuste manual

### Métricas
- `GET /metrics?from=...&to=...&status=COMPLETED` – Métricas do dashboard

### Notificações
- `GET /notifications` – Listar notificações
- `GET /notifications/unread-count` – Contagem de não lidas
- `PUT /notifications/:id/read` – Marcar como lida
- `PUT /notifications/mark-all-read` – Marcar todas como lidas

### Pagamentos (Mercado Pago)
- `POST /payments/sales/:saleId` – Iniciar pagamento (method: `PIX`, `CREDIT_CARD`, `DEBIT_CARD`)
- `GET /payments/status/:paymentId` – Consultar status do pagamento

## Usuários
- `GET /users` – Listar usuários
- `POST /users` – Criar usuário
- `PUT /users/:id` – Atualizar usuário
- `DELETE /users/:id` – Excluir usuário

## Configurações
- `GET /settings` – Obter configurações do sistema
- `PUT /settings` – Atualizar configurações

## Observações

- **Paginação:** As rotas de listagem (produtos, vendas, etc.) aceitam os parâmetros `page` e `limit`.
- **Estoque:** Compras geram movimentação `ENTRY` automaticamente. Vendas completadas geram `EXIT`.
- **Seed inicial:** O banco é populado com um admin padrão e dados de exemplo ao iniciar pela primeira vez.
- **Tema:** Interface com tema claro e acento verde/azulado. Modais unificadas com o componente `BaseModal`.
