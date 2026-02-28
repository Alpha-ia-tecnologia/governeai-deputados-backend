const axios = require('axios');
const { Client } = require('pg');

const API_URL = 'http://localhost:3750';
const DB_CONFIG = {
    host: '144.126.137.156',
    port: 5433,
    user: 'postgres',
    password: 'T1fpOr8Kw7KQEpU781gm9NWy7',
    database: 'governe-deputado',
    ssl: false,
};

function decodeJWT(token) {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64').toString());
}

async function main() {
    console.log('=== Migrando Tipo de Suporte para Help Records ===\n');

    // Login
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@governeai.com',
        password: 'admin123',
    });
    const token = loginRes.data.access_token;
    const userId = decodeJWT(token).sub;
    console.log('Token obtido. UserId:', userId);

    // Connect to DB directly for efficiency
    const client = new Client(DB_CONFIG);
    await client.connect();
    console.log('Conectado ao banco.\n');

    // Get voters with tipoSuporte
    const res = await client.query(
        `SELECT id, name, "tipoSuporte", "vereadorId" FROM voters WHERE "tipoSuporte" IS NOT NULL AND "tipoSuporte" != ''`
    );
    console.log(`Eleitores com tipoSuporte: ${res.rows.length}\n`);

    let created = 0, errors = 0;

    for (let i = 0; i < res.rows.length; i++) {
        const voter = res.rows[i];
        try {
            await client.query(
                `INSERT INTO help_records (id, "voterId", description, status, category, "vereadorId", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, 'completed', 'outros', $3, NOW(), NOW())`,
                [voter.id, voter.tipoSuporte, voter.vereadorId || userId]
            );
            created++;
        } catch (err) {
            errors++;
            if (errors <= 3) {
                console.error(`Erro [${voter.name}]:`, err.message);
            }
        }

        if ((i + 1) % 500 === 0) {
            console.log(`Progresso: ${i + 1}/${res.rows.length} | criados: ${created} | erros: ${errors}`);
        }
    }

    console.log(`\n=== RESULTADO ===`);
    console.log(`Total: ${res.rows.length} | Criados: ${created} | Erros: ${errors}`);

    await client.end();
    console.log('Conexão encerrada.');
}

main().catch(console.error);
