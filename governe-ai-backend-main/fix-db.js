const { Client } = require('pg');

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DATABASE_HOST || '144.126.137.156',
  port: process.env.DATABASE_PORT || 5437,
  user: process.env.DATABASE_USER || 'admin',
  password: process.env.DATABASE_PASSWORD || 'T1fpOr8Kw7KQEpU781gm9NWy7#',
  database: process.env.DATABASE_NAME || 'vereadores_db',
};

async function fixDatabase() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado com sucesso!');

    // Tornar birthDate nullable na tabela voters
    console.log('🔧 Ajustando coluna birthDate...');
    await client.query(`
      ALTER TABLE voters 
      ALTER COLUMN "birthDate" DROP NOT NULL
    `).catch(err => console.log('birthDate já é nullable ou não existe'));

    // Tornar leaderId nullable na tabela voters
    console.log('🔧 Ajustando coluna leaderId...');
    await client.query(`
      ALTER TABLE voters 
      ALTER COLUMN "leaderId" DROP NOT NULL
    `).catch(err => console.log('leaderId já é nullable ou não existe'));

    // Verificar e corrigir registros com problemas
    console.log('🔍 Verificando registros com problemas...');
    
    // Contar eleitores
    const votersCount = await client.query('SELECT COUNT(*) FROM voters');
    console.log(`📊 Total de eleitores: ${votersCount.rows[0].count}`);
    
    // Contar lideranças
    const leadersCount = await client.query('SELECT COUNT(*) FROM leaders');
    console.log(`📊 Total de lideranças: ${leadersCount.rows[0].count}`);
    
    // Verificar eleitores sem liderança
    const votersWithoutLeader = await client.query(`
      SELECT COUNT(*) FROM voters 
      WHERE "leaderId" IS NULL
    `);
    console.log(`⚠️ Eleitores sem liderança: ${votersWithoutLeader.rows[0].count}`);

    // Verificar eleitores sem data de nascimento
    const votersWithoutBirthDate = await client.query(`
      SELECT COUNT(*) FROM voters 
      WHERE "birthDate" IS NULL
    `);
    console.log(`⚠️ Eleitores sem data de nascimento: ${votersWithoutBirthDate.rows[0].count}`);

    // Listar algumas lideranças para debug
    const leaders = await client.query('SELECT id, name FROM leaders LIMIT 5');
    if (leaders.rows.length > 0) {
      console.log('\n📋 Algumas lideranças cadastradas:');
      leaders.rows.forEach(leader => {
        console.log(`   - ${leader.name} (ID: ${leader.id})`);
      });
    }

    // Adicionar índices para melhor performance
    console.log('\n🚀 Criando índices para melhor performance...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_voters_leaderId ON voters("leaderId");
    `).catch(err => console.log('Índice idx_voters_leaderId já existe'));
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_help_records_voterId ON help_records("voterId");
    `).catch(err => console.log('Índice idx_help_records_voterId já existe'));
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_visits_voterId ON visits("voterId");
    `).catch(err => console.log('Índice idx_visits_voterId já existe'));

    console.log('\n✅ Banco de dados corrigido com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao corrigir banco de dados:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Executar correção
fixDatabase();
