/**
 * Migração: Cadastrar Articuladores como Leaders + Vincular Voters
 * 
 * 1. Lê planilha, extrai articuladores únicos
 * 2. Insere cada articulador na tabela 'leaders' (se não existir)
 * 3. Para cada voter na tabela, busca pelo nome na planilha
 * 4. Atualiza o leaderId com o articulador correspondente
 * 5. Voters sem articulador → ADELMO SOARES
 */
const XLSX = require('xlsx');
const { Client } = require('pg');

const XLSX_PATH = '../Cadastro_Pessoas_Gabinete_Social - atualizado.xlsx';

const DB_CONFIG = {
    host: '144.126.137.156',
    port: 5433,
    database: 'governe-deputado',
    user: 'postgres',
    password: 'T1fpOr8Kw7KQEpU781gm9NWy7',
    ssl: false,
};

async function main() {
    console.log('=== Migração: Articuladores Políticos ===\n');

    // 1. Parse Excel
    const wb = XLSX.readFile(XLSX_PATH);
    const ws = wb.Sheets['Cadastro de Pessoas'];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Find header row
    let headerIdx = -1;
    for (let i = 0; i < 10; i++) {
        if (data[i] && data[i][0] === 'Nº') { headerIdx = i; break; }
    }
    if (headerIdx < 0) { console.error('Header row not found!'); return; }

    const headers = data[headerIdx];
    const COL = {};
    headers.forEach((h, i) => { COL[h] = i; });

    console.log('Colunas encontradas:', Object.keys(COL).join(', '));

    // Name column might be "Nome Completo" or "Nome Completo Eleitor"
    const nameCol = COL['Nome Completo Eleitor'] !== undefined ? 'Nome Completo Eleitor' : 'Nome Completo';
    console.log('Coluna de nome:', nameCol);

    const rows = data.slice(headerIdx + 1).filter(r => r[COL[nameCol]]);
    console.log(`Total linhas na planilha: ${rows.length}\n`);

    // 2. Extract unique articuladores
    const articuladorMap = {}; // name_upper -> original_name
    let emptyCount = 0;
    for (const r of rows) {
        const art = String(r[COL['Articulador']] || '').trim();
        if (art) {
            articuladorMap[art.toUpperCase()] = art;
        } else {
            emptyCount++;
        }
    }

    // Ensure ADELMO SOARES is always present (default for empty)
    if (!articuladorMap['ADELMO SOARES']) {
        articuladorMap['ADELMO SOARES'] = 'ADELMO SOARES';
    }

    const articuladores = Object.keys(articuladorMap).sort();
    console.log(`Articuladores únicos: ${articuladores.length}`);
    articuladores.forEach(a => console.log(`  - ${a}`));
    console.log(`Sem articulador (→ ADELMO SOARES): ${emptyCount}\n`);

    // Build voter→articulador map from Excel
    const voterArtMap = {}; // voter_name_upper -> articulador_name_upper
    for (const r of rows) {
        const name = String(r[COL[nameCol]] || '').trim().toUpperCase();
        const art = String(r[COL['Articulador']] || '').trim().toUpperCase();
        if (name) {
            voterArtMap[name] = art || 'ADELMO SOARES';
        }
    }

    // 3. Connect to DB
    const client = new Client(DB_CONFIG);
    await client.connect();
    console.log('Conectado ao banco de dados.\n');

    try {
        // 4. Get vereadorId from existing voters
        const { rows: sampleVoters } = await client.query(
            `SELECT "vereadorId" FROM voters WHERE "vereadorId" IS NOT NULL LIMIT 1`
        );
        const vereadorId = sampleVoters.length > 0 ? sampleVoters[0].vereadorId : null;
        console.log('VereadorId (deputado):', vereadorId);

        // 5. Insert articuladores as leaders
        const leaderIds = {}; // articulador_name_upper -> leader_id
        let createdLeaders = 0, existingLeaders = 0;

        for (const artName of articuladores) {
            // Check if leader already exists
            const { rows: existing } = await client.query(
                `SELECT id FROM leaders WHERE UPPER(TRIM(name)) = $1`,
                [artName]
            );

            if (existing.length > 0) {
                leaderIds[artName] = existing[0].id;
                existingLeaders++;
                console.log(`  [EXISTE] ${artName} -> ${existing[0].id}`);
            } else {
                const { rows: inserted } = await client.query(
                    `INSERT INTO leaders (id, name, phone, "votersCount", "votersGoal", active, "vereadorId", "createdAt", "updatedAt")
                     VALUES (gen_random_uuid(), $1, '', 0, 0, true, $2, NOW(), NOW())
                     RETURNING id`,
                    [articuladorMap[artName], vereadorId]
                );
                leaderIds[artName] = inserted[0].id;
                createdLeaders++;
                console.log(`  [CRIADO] ${artName} -> ${inserted[0].id}`);
            }
        }

        console.log(`\nLeaders: ${createdLeaders} criados, ${existingLeaders} já existiam.\n`);

        // 6. Update voters: set leaderId + articulador field
        const { rows: allVoters } = await client.query(
            `SELECT id, name FROM voters`
        );
        console.log(`Total voters no banco: ${allVoters.length}`);

        let updated = 0, notFound = 0, alreadyLinked = 0;
        const defaultLeaderId = leaderIds['ADELMO SOARES'];

        for (const voter of allVoters) {
            const voterNameUpper = voter.name.trim().toUpperCase();
            const artName = voterArtMap[voterNameUpper] || 'ADELMO SOARES';
            const leaderId = leaderIds[artName] || defaultLeaderId;

            await client.query(
                `UPDATE voters SET "leaderId" = $1, articulador = $2 WHERE id = $3`,
                [leaderId, articuladorMap[artName] || 'ADELMO SOARES', voter.id]
            );
            updated++;

            if (updated % 500 === 0) {
                console.log(`  Progresso: ${updated}/${allVoters.length}`);
            }
        }

        console.log(`  Progresso: ${updated}/${allVoters.length}`);

        // 7. Update votersCount on leaders
        await client.query(`
            UPDATE leaders SET "votersCount" = (
                SELECT COUNT(*) FROM voters WHERE voters."leaderId" = leaders.id
            )
        `);

        console.log('\nvotersCount atualizado nos leaders.');

        // Summary
        console.log('\n=== RESULTADO ===');
        console.log(`Leaders criados: ${createdLeaders}`);
        console.log(`Leaders existentes: ${existingLeaders}`);
        console.log(`Voters atualizados: ${updated}`);

        // Show stats
        const { rows: stats } = await client.query(`
            SELECT l.name, l."votersCount" 
            FROM leaders l 
            ORDER BY l."votersCount" DESC
        `);
        console.log('\n=== Articuladores e contagem ===');
        stats.forEach(s => console.log(`  ${s.name}: ${s.votersCount} eleitores`));

    } finally {
        await client.end();
        console.log('\nConexão encerrada.');
    }
}

main().catch(console.error);
