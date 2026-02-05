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

async function checkLogin() {
    const client = new Client(dbConfig);

    try {
        console.log('🔌 Conectando ao banco de dados...');
        await client.connect();
        console.log('✅ Conectado com sucesso!\n');

        const users = await client.query('SELECT * FROM users');

        console.log(`Found ${users.rows.length} users.`);

        for (const user of users.rows) {
            console.log(`\nChecking user: ${user.email}`);
            console.log(`Stored Hash: ${user.password}`);

            let passwordToTest = 'senha123';
            if (user.email.includes('admin')) {
                passwordToTest = 'admin123';
            }

            const isMatch = await bcrypt.compare(passwordToTest, user.password);
            console.log(`Testing password '${passwordToTest}': ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);

            if (!isMatch) {
                // Try to hash the password and see if it looks similar (just for debug)
                const newHash = await bcrypt.hash(passwordToTest, 10);
                console.log(`Expected Hash format (example): ${newHash}`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.end();
    }
}

checkLogin();
