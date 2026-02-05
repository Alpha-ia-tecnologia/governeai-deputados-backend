require('dotenv/config');
const fs = require('fs');
const readline = require('readline');
const { DataSource } = require('typeorm');

async function run() {
    const csvPath = 'C:/Users/RonaldoPimentel/Documents/governeai/tse_data/votacao_secao_2024_PI.csv';
    console.log('Iniciando importação (TODOS MUNICIPIOS)...');

    const ds = new DataSource({
        type: 'postgres',
        host: '144.126.137.156',
        port: 5437,
        username: 'postgres',
        password: 'T1fpOr8Kw7KQEpU781gm9NWy7#',
        database: 'admin'
    });

    await ds.initialize();
    console.log('✅ Conectado ao banco');

    // Criar tabela
    await ds.query(`
    CREATE TABLE IF NOT EXISTS election_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "electionYear" INTEGER NOT NULL,
      round INTEGER NOT NULL,
      zone INTEGER NOT NULL,
      section INTEGER NOT NULL,
      position VARCHAR(100) NOT NULL,
      "candidateNumber" VARCHAR(20) NOT NULL,
      "candidateName" VARCHAR(255) NOT NULL,
      "partyNumber" VARCHAR(20),
      "partyAcronym" VARCHAR(20),
      "partyName" VARCHAR(100),
      votes INTEGER NOT NULL,
      municipality VARCHAR(100) DEFAULT 'PARNAÍBA',
      state VARCHAR(10) DEFAULT 'PI',
      "createdAt" TIMESTAMP DEFAULT NOW()
    )
  `);
    console.log('✅ Tabela verificada');

    // Limpar
    await ds.query('DELETE FROM election_results');
    console.log('🗑️ Dados anteriores removidos');

    // Ler CSV
    const fileStream = fs.createReadStream(csvPath, { encoding: 'latin1' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let imported = 0;
    let first = true;
    let headers = [];
    let batch = [];
    let municipios = new Set();

    const escapeSql = (str) => (str || '').replace(/'/g, "''");
    const getCol = (row, name) => row[headers.indexOf(name)] || '';

    for await (const line of rl) {
        const values = line.split(';').map(v => v.replace(/"/g, '').trim());

        if (first) {
            headers = values;
            console.log('Headers encontrados:', headers.length);
            // Encontrar índices importantes
            console.log('CD_MUNICIPIO idx:', headers.indexOf('CD_MUNICIPIO'));
            console.log('NM_MUNICIPIO idx:', headers.indexOf('NM_MUNICIPIO'));
            console.log('DS_CARGO idx:', headers.indexOf('DS_CARGO'));
            first = false;
            continue;
        }

        const munName = getCol(values, 'NM_MUNICIPIO');
        municipios.add(munName);

        // Importar TODOS os registros
        const year = parseInt(getCol(values, 'ANO_ELEICAO')) || 2024;
        const turno = parseInt(getCol(values, 'NR_TURNO')) || 1;
        const zone = parseInt(getCol(values, 'NR_ZONA')) || 0;
        const section = parseInt(getCol(values, 'NR_SECAO')) || 0;
        const position = escapeSql(getCol(values, 'DS_CARGO'));
        const candNum = escapeSql(getCol(values, 'NR_VOTAVEL'));
        const candName = escapeSql(getCol(values, 'NM_VOTAVEL'));
        const partyNum = getCol(values, 'NR_PARTIDO');
        const partyAcr = getCol(values, 'SG_PARTIDO');
        const partyName = getCol(values, 'NM_PARTIDO');
        const votes = parseInt(getCol(values, 'QT_VOTOS')) || 0;
        const mun = escapeSql(munName || 'DESCONHECIDO');
        const state = escapeSql(getCol(values, 'SG_UF') || 'PI');

        if (!position || !candNum) continue;

        const partyNumSql = partyNum ? `'${escapeSql(partyNum)}'` : 'NULL';
        const partyAcrSql = partyAcr ? `'${escapeSql(partyAcr)}'` : 'NULL';
        const partyNameSql = partyName ? `'${escapeSql(partyName)}'` : 'NULL';

        batch.push(`(${year}, ${turno}, ${zone}, ${section}, '${position}', '${candNum}', '${candName}', ${partyNumSql}, ${partyAcrSql}, ${partyNameSql}, ${votes}, '${mun}', '${state}')`);

        if (batch.length >= 500) {
            try {
                await ds.query(`
          INSERT INTO election_results ("electionYear", round, zone, section, position, "candidateNumber", "candidateName", "partyNumber", "partyAcronym", "partyName", votes, municipality, state)
          VALUES ${batch.join(',')}
        `);
                imported += batch.length;
                batch = [];
                process.stdout.write(`\r📊 Importados: ${imported.toLocaleString('pt-BR')}...`);
            } catch (err) {
                console.error('\nErro:', err.message.substring(0, 200));
                batch = [];
            }
        }
    }

    if (batch.length > 0) {
        try {
            await ds.query(`
        INSERT INTO election_results ("electionYear", round, zone, section, position, "candidateNumber", "candidateName", "partyNumber", "partyAcronym", "partyName", votes, municipality, state)
        VALUES ${batch.join(',')}
      `);
            imported += batch.length;
        } catch (err) {
            console.error('\nErro final:', err.message.substring(0, 200));
        }
    }

    console.log(`\n\n✅ Importação concluída: ${imported.toLocaleString('pt-BR')} registros`);
    console.log(`\n📍 Municípios encontrados: ${municipios.size}`);

    // Lista alguns municipios
    const munList = [...municipios].sort();
    console.log('Primeiros 10 municípios:');
    munList.slice(0, 10).forEach(m => console.log('  -', m));

    // Verificar se PARNAIBA existe
    const hasParnaiba = munList.some(m => m.toUpperCase().includes('PARNAIBA') || m.toUpperCase().includes('PARNAÍBA'));
    console.log('\nTem PARNAÍBA?', hasParnaiba);

    if (hasParnaiba) {
        const parnaibaName = munList.find(m => m.toUpperCase().includes('PARNAIBA') || m.toUpperCase().includes('PARNAÍBA'));
        console.log('Nome encontrado:', parnaibaName);

        // Contar votos de Parnaíba
        const pCount = await ds.query(`SELECT COUNT(*) as c FROM election_results WHERE municipality ILIKE '%parnaiba%' OR municipality ILIKE '%parnaíba%'`);
        console.log('Registros de Parnaíba:', pCount[0].c);
    }

    await ds.destroy();
    console.log('\n🔌 Conexão encerrada');
}

run().catch(e => {
    console.error('❌ ERRO:', e);
    process.exit(1);
});
