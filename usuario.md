# Usuário

## Modelo

O sistema utiliza um modelo de usuário armazenado no MongoDB com os seguintes campos:

| Campo       | Tipo     | Descrição                          |
|-------------|----------|------------------------------------|
| `name`      | String   | Nome completo do usuário           |
| `email`     | String   | Email único para login             |
| `password`  | String   | Hash da senha (bcrypt)             |
| `role`      | String   | Perfil de acesso (`admin` ou `user`) |
| `active`    | Boolean  | Se o usuário está ativo            |
| `createdAt` | Date     | Data de criação                    |
| `updatedAt` | Date     | Data da última atualização         |

## Autenticação

- **Login:** `POST /auth/login` — retorna um token JWT.
- **Autorização:** O token JWT deve ser enviado no header `Authorization: Bearer <token>`.
- **Middleware `auth.ts`:** verifica o token e anexa os dados do usuário à requisição.

## Rotas protegidas

Todas as rotas administrativas exigem autenticação JWT. O middleware de autenticação é aplicado globalmente nas rotas do admin.

## Seed

O banco é semeado com um usuário administrador padrão:

- **Email:** admin@example.com
- **Senha:** admin123
