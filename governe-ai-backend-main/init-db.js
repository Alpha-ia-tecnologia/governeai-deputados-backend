const { Client } = require('pg');
const bcrypt = require('bcrypt');

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DATABASE_HOST || '144.126.137.156',
  port: process.env.DATABASE_PORT || 5437,
  user: process.env.DATABASE_USER || 'admin',
  password: process.env.DATABASE_PASSWORD || 'T1fpOr8Kw7KQEpU781gm9NWy7#',
  database: process.env.DATABASE_NAME || 'vereadores_db',
};

async function initDatabase() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado com sucesso!');

    // Criar tabela de usuários se não existir
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        cpf VARCHAR(14) UNIQUE NOT NULL,
        phone VARCHAR(20) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'assessor',
        region VARCHAR(255),
        active BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createUsersTable);
    console.log('✅ Tabela de usuários verificada/criada');

    // Verificar se já existe um admin
    const checkAdmin = await client.query(
      "SELECT * FROM users WHERE email = 'admin@parna.ba.gov.br'"
    );

    if (checkAdmin.rows.length === 0) {
      // Criar usuário admin padrão
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const insertAdmin = `
        INSERT INTO users (name, email, password, cpf, phone, role, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;

      const adminData = [
        'Administrador',
        'admin@parna.ba.gov.br',
        hashedPassword,
        '00000000000',
        '77999999999',
        'admin',
        true
      ];

      const result = await client.query(insertAdmin, adminData);
      console.log('✅ Usuário admin criado com sucesso!');
      console.log('📧 Email: admin@parna.ba.gov.br');
      console.log('🔑 Senha: admin123');
    } else {
      console.log('ℹ️ Usuário admin já existe');
    }

    // Criar outras tabelas necessárias
    const createTables = `
      -- Tabela de lideranças
      CREATE TABLE IF NOT EXISTS leaders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        cpf VARCHAR(14) UNIQUE NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        region VARCHAR(255),
        "votersCount" INTEGER DEFAULT 0,
        "votersGoal" INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabela de eleitores
      CREATE TABLE IF NOT EXISTS voters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        cpf VARCHAR(14),
        "voterRegistration" VARCHAR(20),
        "birthDate" DATE,
        phone VARCHAR(20),
        address VARCHAR(255),
        neighborhood VARCHAR(255),
        "votesCount" INTEGER DEFAULT 0,
        "leaderId" UUID REFERENCES leaders(id),
        notes TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabela de visitas
      CREATE TABLE IF NOT EXISTS visits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "voterId" UUID REFERENCES voters(id),
        "leaderId" UUID REFERENCES leaders(id),
        date TIMESTAMP,
        objective TEXT,
        result TEXT,
        "nextSteps" TEXT,
        photos TEXT[],
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabela de ajudas
      CREATE TABLE IF NOT EXISTS help_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "voterId" UUID REFERENCES voters(id),
        "leaderId" UUID REFERENCES leaders(id),
        category VARCHAR(50),
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        "responsibleId" UUID REFERENCES users(id),
        documents TEXT[],
        notes TEXT,
        "completedAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabela de projetos
      CREATE TABLE IF NOT EXISTS law_projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        number VARCHAR(50),
        title VARCHAR(255),
        summary TEXT,
        "fullText" TEXT,
        "protocolDate" DATE,
        status VARCHAR(20),
        timeline JSONB,
        votes JSONB,
        "pdfUrl" VARCHAR(500),
        views INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabela de emendas
      CREATE TABLE IF NOT EXISTS amendments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50),
        value DECIMAL(15, 2),
        destination VARCHAR(255),
        objective TEXT,
        status VARCHAR(20),
        "executionPercentage" INTEGER DEFAULT 0,
        documents TEXT[],
        photos TEXT[],
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabela de compromissos
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255),
        description TEXT,
        type VARCHAR(20),
        status VARCHAR(20) DEFAULT 'scheduled',
        date DATE,
        time VARCHAR(10),
        duration INTEGER,
        location VARCHAR(255),
        "voterId" UUID REFERENCES voters(id),
        "leaderId" UUID REFERENCES leaders(id),
        "responsibleId" UUID REFERENCES users(id),
        notes TEXT,
        reminders JSONB,
        completed BOOLEAN DEFAULT false,
        "completedAt" TIMESTAMP,
        "completedNotes" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createTables);
    console.log('✅ Todas as tabelas foram verificadas/criadas');

    console.log('\n🎉 Banco de dados inicializado com sucesso!');
    console.log('📝 Você pode fazer login com:');
    console.log('   Email: admin@parna.ba.gov.br');
    console.log('   Senha: admin123');

  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Executar inicialização
initDatabase();
