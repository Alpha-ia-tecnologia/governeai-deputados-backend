# Backend - Sistema de Vereadores Parna-BA

Backend completo em NestJS + TypeScript + PostgreSQL

## 🚀 Funcionalidades

- ✅ Autenticação JWT
- ✅ CRUD completo de Usuários
- ✅ CRUD completo de Eleitores (Voters)
- ✅ CRUD completo de Lideranças (Leaders)
- ✅ CRUD completo de Atendimentos (HelpRecords)
- ✅ CRUD completo de Visitas (Visits)
- ✅ CRUD completo de Projetos de Lei (LawProjects)
- ✅ CRUD completo de Emendas (Amendments)
- ✅ CRUD completo de Compromissos (Appointments)

## 📋 Pré-requisitos

- Node.js 18+
- PostgreSQL 12+

## ⚙️ Configuração

1. Instalar dependências:
```bash
npm install
```

2. Configurar variáveis de ambiente (arquivo `.env` já configurado):
```env
DATABASE_HOST=144.126.137.156
DATABASE_PORT=5437
DATABASE_USER=postgres
DATABASE_PASSWORD="T1fpOr8Kw7KQEpU781gm9NWy7#"
DATABASE_NAME=admin

JWT_SECRET=vereadores-parna-ba-secret-key-2024
JWT_EXPIRATION=7d

PORT=3000
```

## 🏃 Executar

### Desenvolvimento
```bash
npm run start:dev
```

### Produção
```bash
npm run build
npm run start:prod
```

## 📡 Endpoints da API

### Autenticação
- `POST /auth/login` - Login de usuário
- `POST /auth/register` - Registro de novo usuário

### Usuários
- `GET /users` - Listar todos os usuários
- `GET /users/:id` - Buscar usuário por ID
- `POST /users` - Criar novo usuário
- `PATCH /users/:id` - Atualizar usuário
- `DELETE /users/:id` - Deletar usuário

### Eleitores (Voters)
- `GET /voters` - Listar todos os eleitores
- `GET /voters/:id` - Buscar eleitor por ID
- `POST /voters` - Criar novo eleitor
- `PATCH /voters/:id` - Atualizar eleitor
- `DELETE /voters/:id` - Deletar eleitor

### Lideranças (Leaders)
- `GET /leaders` - Listar todas as lideranças
- `GET /leaders/:id` - Buscar liderança por ID
- `POST /leaders` - Criar nova liderança
- `PATCH /leaders/:id` - Atualizar liderança
- `DELETE /leaders/:id` - Deletar liderança

### Atendimentos (HelpRecords)
- `GET /help-records` - Listar todos os atendimentos
- `GET /help-records/:id` - Buscar atendimento por ID
- `POST /help-records` - Criar novo atendimento
- `PATCH /help-records/:id` - Atualizar atendimento
- `DELETE /help-records/:id` - Deletar atendimento

### Visitas (Visits)
- `GET /visits` - Listar todas as visitas
- `GET /visits/:id` - Buscar visita por ID
- `POST /visits` - Criar nova visita
- `PATCH /visits/:id` - Atualizar visita
- `DELETE /visits/:id` - Deletar visita

### Projetos de Lei (Projects)
- `GET /projects` - Listar todos os projetos
- `GET /projects/:id` - Buscar projeto por ID
- `POST /projects` - Criar novo projeto
- `PATCH /projects/:id` - Atualizar projeto
- `DELETE /projects/:id` - Deletar projeto
- `POST /projects/:id/view` - Incrementar visualizações

### Emendas (Amendments)
- `GET /amendments` - Listar todas as emendas
- `GET /amendments/:id` - Buscar emenda por ID
- `POST /amendments` - Criar nova emenda
- `PATCH /amendments/:id` - Atualizar emenda
- `DELETE /amendments/:id` - Deletar emenda

### Compromissos (Appointments)
- `GET /appointments` - Listar todos os compromissos
- `GET /appointments/:id` - Buscar compromisso por ID
- `POST /appointments` - Criar novo compromisso
- `PATCH /appointments/:id` - Atualizar compromisso
- `DELETE /appointments/:id` - Deletar compromisso

## 🔒 Autenticação

Todas as rotas (exceto `/auth/login` e `/auth/register`) requerem autenticação JWT.

Incluir o token no header:
```
Authorization: Bearer {seu_token_jwt}
```

## 🗄️ Banco de Dados

O TypeORM está configurado com `synchronize: true`, o que significa que as tabelas serão criadas automaticamente na primeira execução.

**⚠️ ATENÇÃO:** Em produção, configure `synchronize: false` e use migrations.

## 🏗️ Estrutura do Projeto

```
backend/
├── src/
│   ├── auth/              # Autenticação JWT
│   ├── users/             # Módulo de usuários
│   ├── voters/            # Módulo de eleitores
│   ├── leaders/           # Módulo de lideranças
│   ├── help-records/      # Módulo de atendimentos
│   ├── visits/            # Módulo de visitas
│   ├── projects/          # Módulo de projetos de lei
│   ├── amendments/        # Módulo de emendas
│   ├── appointments/      # Módulo de compromissos
│   ├── app.module.ts      # Módulo principal
│   └── main.ts            # Arquivo de entrada
├── .env                   # Variáveis de ambiente
├── package.json
└── tsconfig.json
```

## 📝 Exemplo de Uso

### 1. Registrar usuário
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "admin@exemplo.com",
    "password": "senha123",
    "cpf": "12345678900",
    "phone": "(77) 99999-9999",
    "role": "admin"
  }'
```

### 2. Fazer login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@exemplo.com",
    "password": "senha123"
  }'
```

### 3. Criar eleitor (com token)
```bash
curl -X POST http://localhost:3000/voters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "name": "João Silva",
    "phone": "(77) 98888-7777",
    "birthDate": "1990-05-15",
    "leaderId": "uuid-da-lideranca",
    "votesCount": 0
  }'
```

## 🔧 Tecnologias Utilizadas

- NestJS 11
- TypeScript 5
- TypeORM 0.3
- PostgreSQL
- JWT (Passport)
- Bcrypt
- Class Validator
- Class Transformer
