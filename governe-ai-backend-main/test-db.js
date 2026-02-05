const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl: false,
});

async function testConnection() {
  try {
    console.log('Testando conexão ao PostgreSQL...');
    console.log(`Host: ${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}`);
    console.log(`Database: ${process.env.DATABASE_NAME}`);
    console.log(`User: ${process.env.DATABASE_USER}`);

    await client.connect();
    console.log('✅ Conexão estabelecida com sucesso!');

    const res = await client.query('SELECT NOW()');
    console.log('✅ Query executada:', res.rows[0]);

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco:', error.message);
    console.error('Detalhes:', error);
    process.exit(1);
  }
}

testConnection();
