const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DATABASE_HOST || '144.126.137.156',
  port: process.env.DATABASE_PORT || 5437,
  user: process.env.DATABASE_USER || 'admin',
  password: process.env.DATABASE_PASSWORD || 'T1fpOr8Kw7KQEpU781gm9NWy7#',
  database: process.env.DATABASE_NAME || 'vereadores_db',
};

async function seedUsers() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado com sucesso!\n');

    // Verificar se já existe admin
    const adminCheck = await client.query(
      "SELECT * FROM users WHERE email = 'admin@parna.ba.gov.br'"
    );

    if (adminCheck.rows.length === 0) {
      console.log('👤 Criando usuário admin...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await client.query(`
        INSERT INTO users (id, name, email, password, cpf, phone, role, active, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [
        uuidv4(),
        'Administrador',
        'admin@parna.ba.gov.br',
        hashedPassword,
        '00000000000',
        '77999999999',
        'admin',
        true
      ]);
      
      console.log('✅ Admin criado: admin@parna.ba.gov.br / admin123');
    }

    // Criar outros usuários de teste
    console.log('\n👥 Criando usuários de teste...');
    
    const users = [
      {
        name: 'Vereador João Silva',
        email: 'vereador.joao@parna.ba.gov.br',
        password: 'senha123',
        cpf: '11111111111',
        phone: '77988887777',
        role: 'vereador',
        region: 'Centro',
        active: true,
      },
      {
        name: 'Liderança Maria Santos',
        email: 'maria.lider@parna.ba.gov.br',
        password: 'senha123',
        cpf: '22222222222',
        phone: '77977776666',
        role: 'lideranca',
        region: 'Norte',
        active: true,
      },
      {
        name: 'Assessor Pedro Costa',
        email: 'pedro.assessor@parna.ba.gov.br',
        password: 'senha123',
        cpf: '33333333333',
        phone: '77966665555',
        role: 'assessor',
        region: null,
        active: true,
      },
      {
        name: 'Assessor Ana Lima',
        email: 'ana.assessor@parna.ba.gov.br',
        password: 'senha123',
        cpf: '44444444444',
        phone: '77955554444',
        role: 'assessor',
        region: null,
        active: false, // Usuário inativo para teste
      },
    ];

    for (const user of users) {
      try {
        // Verificar se usuário já existe
        const existingUser = await client.query(
          'SELECT * FROM users WHERE email = $1 OR cpf = $2',
          [user.email, user.cpf]
        );

        if (existingUser.rows.length === 0) {
          const hashedPassword = await bcrypt.hash(user.password, 10);
          
          await client.query(`
            INSERT INTO users (id, name, email, password, cpf, phone, role, region, active, "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          `, [
            uuidv4(),
            user.name,
            user.email,
            hashedPassword,
            user.cpf,
            user.phone,
            user.role,
            user.region,
            user.active
          ]);
          
          console.log(`✅ Usuário criado: ${user.name} (${user.email})`);
        } else {
          console.log(`⚠️ Usuário já existe: ${user.email}`);
        }
      } catch (error) {
        console.log(`❌ Erro ao criar usuário ${user.name}:`, error.message);
      }
    }

    // Verificar total de usuários
    console.log('\n📊 Resumo:');
    const totalUsers = await client.query('SELECT COUNT(*) FROM users');
    console.log(`   Total de usuários: ${totalUsers.rows[0].count}`);
    
    const activeUsers = await client.query('SELECT COUNT(*) FROM users WHERE active = true');
    console.log(`   Usuários ativos: ${activeUsers.rows[0].count}`);
    
    const adminUsers = await client.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    console.log(`   Administradores: ${adminUsers.rows[0].count}`);

    console.log('\n✅ Usuários de teste criados com sucesso!');
    console.log('📝 Credenciais de teste:');
    console.log('   Admin: admin@parna.ba.gov.br / admin123');
    console.log('   Outros: senha123');

  } catch (error) {
    console.error('❌ Erro ao criar usuários:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Executar seed
seedUsers();
