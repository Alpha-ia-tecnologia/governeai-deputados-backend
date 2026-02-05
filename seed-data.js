const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DATABASE_HOST || '144.126.137.156',
  port: process.env.DATABASE_PORT || 5437,
  user: process.env.DATABASE_USER || 'admin',
  password: process.env.DATABASE_PASSWORD || 'T1fpOr8Kw7KQEpU781gm9NWy7#',
  database: process.env.DATABASE_NAME || 'vereadores_db',
};

async function seedData() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado com sucesso!\n');

    // Limpar dados existentes (opcional)
    const clearData = false; // Mude para true se quiser limpar os dados antes
    
    if (clearData) {
      console.log('🗑️ Limpando dados existentes...');
      await client.query('DELETE FROM visits');
      await client.query('DELETE FROM help_records');
      await client.query('DELETE FROM voters');
      await client.query('DELETE FROM leaders');
      console.log('✅ Dados limpos!\n');
    }

    // Criar lideranças de teste
    console.log('👥 Criando lideranças de teste...');
    
    const leaders = [
      {
        id: uuidv4(),
        name: 'João Silva',
        cpf: '12345678901',
        phone: '77999887766',
        email: 'joao.silva@email.com',
        region: 'Centro',
        votersCount: 0,
        votersGoal: 50,
        active: true,
      },
      {
        id: uuidv4(),
        name: 'Maria Santos',
        cpf: '98765432109',
        phone: '77988776655',
        email: 'maria.santos@email.com',
        region: 'Norte',
        votersCount: 0,
        votersGoal: 40,
        active: true,
      },
      {
        id: uuidv4(),
        name: 'Pedro Oliveira',
        cpf: '45678912303',
        phone: '77977665544',
        email: 'pedro.oliveira@email.com',
        region: 'Sul',
        votersCount: 0,
        votersGoal: 60,
        active: true,
      },
    ];

    for (const leader of leaders) {
      const query = `
        INSERT INTO leaders (id, name, cpf, phone, email, region, "votersCount", "votersGoal", active, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        ON CONFLICT (cpf) DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          region = EXCLUDED.region,
          "updatedAt" = NOW()
        RETURNING id, name;
      `;
      
      const result = await client.query(query, [
        leader.id,
        leader.name,
        leader.cpf,
        leader.phone,
        leader.email,
        leader.region,
        leader.votersCount,
        leader.votersGoal,
        leader.active,
      ]);
      
      console.log(`✅ Liderança criada: ${result.rows[0].name}`);
    }

    // Criar eleitores de teste
    console.log('\n🗳️ Criando eleitores de teste...');
    
    const voters = [
      {
        name: 'Ana Costa',
        cpf: '11122233344',
        voterRegistration: '123456789012',
        birthDate: '1985-05-15',
        phone: '77999112233',
        address: 'Rua A, 123',
        neighborhood: 'Centro',
        votesCount: 1,
        leaderId: leaders[0].id,
        notes: 'Eleitor ativo na comunidade',
      },
      {
        name: 'Carlos Mendes',
        cpf: '22233344455',
        voterRegistration: '234567890123',
        birthDate: '1990-08-20',
        phone: '77988223344',
        address: 'Rua B, 456',
        neighborhood: 'Norte',
        votesCount: 2,
        leaderId: leaders[1].id,
        notes: 'Participante regular',
      },
      {
        name: 'Beatriz Lima',
        cpf: '33344455566',
        voterRegistration: '345678901234',
        birthDate: '1978-03-10',
        phone: '77977334455',
        address: 'Rua C, 789',
        neighborhood: 'Sul',
        votesCount: 1,
        leaderId: leaders[2].id,
        notes: null,
      },
      {
        name: 'Daniel Ferreira',
        cpf: '44455566677',
        voterRegistration: null,
        birthDate: '1995-12-25',
        phone: '77966445566',
        address: 'Rua D, 321',
        neighborhood: 'Leste',
        votesCount: 0,
        leaderId: leaders[0].id,
        notes: 'Novo eleitor',
      },
      {
        name: 'Eduarda Souza',
        cpf: null,
        voterRegistration: '456789012345',
        birthDate: null,
        phone: '77955556677',
        address: null,
        neighborhood: 'Oeste',
        votesCount: 1,
        leaderId: null,
        notes: 'Dados incompletos - atualizar',
      },
    ];

    for (const voter of voters) {
      const query = `
        INSERT INTO voters (
          id, name, cpf, "voterRegistration", "birthDate", phone, 
          address, neighborhood, "votesCount", "leaderId", notes, 
          "createdAt", "updatedAt"
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
        )
        ON CONFLICT (cpf) WHERE cpf IS NOT NULL DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          "updatedAt" = NOW()
        RETURNING id, name;
      `;
      
      try {
        const result = await client.query(query, [
          uuidv4(),
          voter.name,
          voter.cpf,
          voter.voterRegistration,
          voter.birthDate,
          voter.phone,
          voter.address,
          voter.neighborhood,
          voter.votesCount,
          voter.leaderId,
          voter.notes,
        ]);
        
        console.log(`✅ Eleitor criado: ${result.rows[0].name}`);
      } catch (error) {
        console.log(`⚠️ Eleitor ${voter.name} pode já existir ou houve erro:`, error.message);
      }
    }

    // Atualizar contadores de eleitores nas lideranças
    console.log('\n📊 Atualizando contadores...');
    await client.query(`
      UPDATE leaders l
      SET "votersCount" = (
        SELECT COUNT(*)
        FROM voters v
        WHERE v."leaderId" = l.id
      )
    `);
    console.log('✅ Contadores atualizados!');

    // Verificar dados inseridos
    console.log('\n📈 Resumo dos dados:');
    
    const leadersCount = await client.query('SELECT COUNT(*) FROM leaders');
    console.log(`   - Total de lideranças: ${leadersCount.rows[0].count}`);
    
    const votersCount = await client.query('SELECT COUNT(*) FROM voters');
    console.log(`   - Total de eleitores: ${votersCount.rows[0].count}`);
    
    const votersWithLeader = await client.query('SELECT COUNT(*) FROM voters WHERE "leaderId" IS NOT NULL');
    console.log(`   - Eleitores com liderança: ${votersWithLeader.rows[0].count}`);
    
    const votersWithoutLeader = await client.query('SELECT COUNT(*) FROM voters WHERE "leaderId" IS NULL');
    console.log(`   - Eleitores sem liderança: ${votersWithoutLeader.rows[0].count}`);

    console.log('\n✅ Dados de teste inseridos com sucesso!');
    console.log('🔄 Reinicie o servidor backend para testar: npm run start:dev');

  } catch (error) {
    console.error('❌ Erro ao inserir dados:', error.message);
    console.error('Detalhes:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Executar seed
seedData();
