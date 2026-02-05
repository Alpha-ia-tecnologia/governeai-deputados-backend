/**
 * Script para importar dados eleitorais do TSE para Parnaíba
 * Execução: npx ts-node src/scripts/import-election-data.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as readline from 'readline';
import { DataSource } from 'typeorm';

interface ElectionRecord {
    electionYear: number;
    round: number;
    zone: number;
    section: number;
    position: string;
    candidateNumber: string;
    candidateName: string;
    partyNumber: string | null;
    partyAcronym: string | null;
    partyName: string | null;
    votes: number;
    municipality: string;
    state: string;
}

async function importData() {
    const csvPath = 'C:/Users/RonaldoPimentel/Documents/governeai/tse_data/votacao_secao_2024_PI.csv';
    const municipalityCode = '11029'; // Código de Parnaíba

    console.log('🚀 Iniciando importação de dados eleitorais...');
    console.log(`📂 Arquivo: ${csvPath}`);

    // Conectar ao banco usando credenciais da produção
    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DATABASE_HOST || '144.126.137.156',
        port: parseInt(process.env.DATABASE_PORT || '5437'),
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'T1fpOr8Kw7KQEpU781gm9NWy7#',
        database: process.env.DATABASE_NAME || 'admin',
    });

    await dataSource.initialize();
    console.log('✅ Conexão com banco estabelecida');

    // Criar tabela se não existir
    await dataSource.query(`
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
    console.log('✅ Tabela election_results verificada/criada');

    // Criar índices
    await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_er_zone ON election_results(zone)`);
    await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_er_section ON election_results(section)`);
    await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_er_position ON election_results(position)`);
    await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_er_candidate ON election_results("candidateName")`);
    console.log('✅ Índices criados');

    // Limpar dados anteriores
    await dataSource.query('DELETE FROM election_results');
    console.log('🗑️ Dados anteriores removidos');

    // Ler arquivo CSV
    const fileStream = fs.createReadStream(csvPath, { encoding: 'latin1' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let imported = 0;
    let skipped = 0;
    let isFirstLine = true;
    let headers: string[] = [];
    const batch: ElectionRecord[] = [];

    for await (const line of rl) {
        if (isFirstLine) {
            headers = line.split(';').map(h => h.replace(/"/g, '').trim());
            isFirstLine = false;
            continue;
        }

        const values = line.split(';').map(v => v.replace(/"/g, '').trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] || ''; });

        // Filtrar apenas Parnaíba (código 11029)
        if (row['CD_MUNICIPIO'] !== municipalityCode) {
            skipped++;
            continue;
        }

        const record: ElectionRecord = {
            electionYear: parseInt(row['ANO_ELEICAO']) || 2024,
            round: parseInt(row['NR_TURNO']) || 1,
            zone: parseInt(row['NR_ZONA']) || 0,
            section: parseInt(row['NR_SECAO']) || 0,
            position: row['DS_CARGO'] || '',
            candidateNumber: row['NR_VOTAVEL'] || '',
            candidateName: row['NM_VOTAVEL'] || '',
            partyNumber: row['NR_PARTIDO'] || null,
            partyAcronym: row['SG_PARTIDO'] || null,
            partyName: row['NM_PARTIDO'] || null,
            votes: parseInt(row['QT_VOTOS']) || 0,
            municipality: row['NM_MUNICIPIO'] || 'PARNAÍBA',
            state: row['SG_UF'] || 'PI',
        };

        batch.push(record);

        // Inserir em lotes de 500
        if (batch.length >= 500) {
            await insertBatch(dataSource, batch);
            imported += batch.length;
            batch.length = 0;
            process.stdout.write(`\r📊 Importados: ${imported.toLocaleString('pt-BR')} registros...`);
        }
    }

    // Inserir registros restantes
    if (batch.length > 0) {
        await insertBatch(dataSource, batch);
        imported += batch.length;
    }

    console.log(`\n\n✅ Importação concluída!`);
    console.log(`   📊 Registros importados: ${imported.toLocaleString('pt-BR')}`);
    console.log(`   ⏭️ Registros ignorados (outros municípios): ${skipped.toLocaleString('pt-BR')}`);

    // Mostrar resumo
    const summary = await dataSource.query(`
    SELECT position, COUNT(*) as records, SUM(votes) as total_votes
    FROM election_results
    GROUP BY position
  `);
    console.log('\n📈 Resumo por cargo:');
    summary.forEach((s: any) => {
        console.log(`   - ${s.position}: ${parseInt(s.records).toLocaleString('pt-BR')} registros, ${parseInt(s.total_votes).toLocaleString('pt-BR')} votos`);
    });

    await dataSource.destroy();
    console.log('\n🔌 Conexão encerrada');
}

async function insertBatch(dataSource: DataSource, batch: ElectionRecord[]) {
    const values = batch.map(r =>
        `(${r.electionYear}, ${r.round}, ${r.zone}, ${r.section}, '${escapeSql(r.position)}', '${escapeSql(r.candidateNumber)}', '${escapeSql(r.candidateName)}', ${r.partyNumber ? `'${escapeSql(r.partyNumber)}'` : 'NULL'}, ${r.partyAcronym ? `'${escapeSql(r.partyAcronym)}'` : 'NULL'}, ${r.partyName ? `'${escapeSql(r.partyName)}'` : 'NULL'}, ${r.votes}, '${escapeSql(r.municipality)}', '${escapeSql(r.state)}')`
    ).join(',');

    await dataSource.query(`
    INSERT INTO election_results ("electionYear", round, zone, section, position, "candidateNumber", "candidateName", "partyNumber", "partyAcronym", "partyName", votes, municipality, state)
    VALUES ${values}
  `);
}

function escapeSql(str: string): string {
    return str.replace(/'/g, "''");
}

importData().catch(err => {
    console.error('❌ Erro na importação:', err);
    process.exit(1);
});
