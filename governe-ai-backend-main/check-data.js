const { Client } = require('pg');

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DATABASE_HOST || '144.126.137.156',
  port: process.env.DATABASE_PORT || 5437,
  user: process.env.DATABASE_USER || 'admin',
  password: process.env.DATABASE_PASSWORD || 'T1fpOr8Kw7KQEpU781gm9NWy7#',
  database: process.env.DATABASE_NAME || 'vereadores_db',
};

async function checkData() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado com sucesso!\n');

    // Verificar tabelas
    console.log('📊 VERIFICANDO ESTRUTURA DAS TABELAS:');
    console.log('=====================================\n');
    
    // Verificar se a tabela voters existe
    const tablesQuery = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📋 Tabelas existentes:');
    tablesQuery.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    console.log('\n📊 VERIFICANDO DADOS:');
    console.log('====================\n');
    
    // Verificar lideranças
    const leaders = await client.query('SELECT * FROM leaders ORDER BY "createdAt" DESC');
    console.log(`👥 LIDERANÇAS: ${leaders.rows.length} registros`);
    if (leaders.rows.length > 0) {
      console.log('Últimas 3 lideranças:');
      leaders.rows.slice(0, 3).forEach(leader => {
        console.log(`   - ${leader.name} (ID: ${leader.id})`);
        console.log(`     CPF: ${leader.cpf}, Tel: ${leader.phone}`);
        console.log(`     Região: ${leader.region || 'Não definida'}`);
        console.log(`     Ativo: ${leader.active ? 'Sim' : 'Não'}`);
        console.log(`     Criado em: ${leader.createdAt}\n`);
      });
    }
    
    // Verificar eleitores
    const voters = await client.query(`
      SELECT v.*, l.name as leader_name 
      FROM voters v
      LEFT JOIN leaders l ON v."leaderId" = l.id
      ORDER BY v."createdAt" DESC
    `);
    
    console.log(`\n🗳️ ELEITORES: ${voters.rows.length} registros`);
    if (voters.rows.length > 0) {
      console.log('Últimos 5 eleitores:');
      voters.rows.slice(0, 5).forEach(voter => {
        console.log(`   - ${voter.name} (ID: ${voter.id})`);
        console.log(`     CPF: ${voter.cpf || 'Não informado'}`);
        console.log(`     Tel: ${voter.phone}`);
        console.log(`     Nascimento: ${voter.birthDate || 'Não informado'}`);
        console.log(`     Liderança: ${voter.leader_name || 'Sem liderança'}`);
        console.log(`     Bairro: ${voter.neighborhood || 'Não informado'}`);
        console.log(`     Criado em: ${voter.createdAt}\n`);
      });
    }
    
    // Verificar estrutura da tabela voters
    console.log('\n📋 ESTRUTURA DA TABELA VOTERS:');
    console.log('==============================\n');
    
    const columnsQuery = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'voters'
      ORDER BY ordinal_position;
    `);
    
    console.log('Colunas:');
    columnsQuery.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'}`);
    });
    
    // Verificar usuários
    const users = await client.query('SELECT * FROM users ORDER BY "createdAt" DESC');
    console.log(`\n👤 USUÁRIOS: ${users.rows.length} registros`);
    if (users.rows.length > 0) {
      users.rows.forEach(user => {
        console.log(`   - ${user.name} (${user.email})`);
        console.log(`     Role: ${user.role}, Ativo: ${user.active ? 'Sim' : 'Não'}`);
      });
    }
    
    console.log('\n✅ Verificação concluída!');

  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error.message);
    console.error('Detalhes:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Executar verificação
checkData();
