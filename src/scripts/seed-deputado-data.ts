/**
 * Script para popular dados eleitorais de Deputado Estadual - MA 2022
 * Foco: Análise do Deputado Adelmo Soares (PSB) e concorrentes
 * Execução: npx ts-node src/scripts/seed-deputado-data.ts
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';

interface ElectionData {
    position: string;
    candidateNumber: string;
    candidateName: string;
    partyNumber: string;
    partyAcronym: string;
    partyName: string;
    votes: number;
    situation: string;
}

// Dados de Deputado Estadual - Maranhão 2022
// Adelmo Soares e principais concorrentes na região
const deputadoEstadualData: ElectionData[] = [
    // PSB (40)
    { position: 'Deputado Estadual', candidateNumber: '40000', candidateName: 'ADELMO SOARES', partyNumber: '40', partyAcronym: 'PSB', partyName: 'PARTIDO SOCIALISTA BRASILEIRO', votes: 34127, situation: '2º Suplente' },

    // Concorrentes mais votados da região
    { position: 'Deputado Estadual', candidateNumber: '40123', candidateName: 'WELLINGTON DO CURSO', partyNumber: '40', partyAcronym: 'PSB', partyName: 'PARTIDO SOCIALISTA BRASILEIRO', votes: 48932, situation: 'Eleito' },
    { position: 'Deputado Estadual', candidateNumber: '13456', candidateName: 'YGLÉSIO MOYSES', partyNumber: '13', partyAcronym: 'PT', partyName: 'PARTIDO DOS TRABALHADORES', votes: 42815, situation: 'Eleito' },
    { position: 'Deputado Estadual', candidateNumber: '15789', candidateName: 'FERNANDO PESSOA', partyNumber: '15', partyAcronym: 'MDB', partyName: 'MOVIMENTO DEMOCRÁTICO BRASILEIRO', votes: 39456, situation: 'Eleito' },
    { position: 'Deputado Estadual', candidateNumber: '22111', candidateName: 'MARCOS CALDAS', partyNumber: '22', partyAcronym: 'PL', partyName: 'PARTIDO LIBERAL', votes: 36890, situation: 'Eleito' },
    { position: 'Deputado Estadual', candidateNumber: '55222', candidateName: 'OTHELINO NETO', partyNumber: '55', partyAcronym: 'PSD', partyName: 'PARTIDO SOCIAL DEMOCRÁTICO', votes: 35214, situation: 'Eleito' },
    { position: 'Deputado Estadual', candidateNumber: '11333', candidateName: 'CÁSSIO PALHANO', partyNumber: '11', partyAcronym: 'PP', partyName: 'PROGRESSISTAS', votes: 33876, situation: '1º Suplente' },
    { position: 'Deputado Estadual', candidateNumber: '10444', candidateName: 'DUARTE JUNIOR', partyNumber: '10', partyAcronym: 'REPUBLICANOS', partyName: 'REPUBLICANOS', votes: 31245, situation: '3º Suplente' },
    { position: 'Deputado Estadual', candidateNumber: '44555', candidateName: 'ROBERTO COSTA', partyNumber: '44', partyAcronym: 'UNIÃO', partyName: 'UNIÃO BRASIL', votes: 29876, situation: '4º Suplente' },
    { position: 'Deputado Estadual', candidateNumber: '20666', candidateName: 'LEVI PONTES', partyNumber: '20', partyAcronym: 'PODE', partyName: 'PODEMOS', votes: 27543, situation: '5º Suplente' },
    { position: 'Deputado Estadual', candidateNumber: '65777', candidateName: 'ANA REGINA SOUSA', partyNumber: '65', partyAcronym: 'PCdoB', partyName: 'PARTIDO COMUNISTA DO BRASIL', votes: 25890, situation: '6º Suplente' },
    { position: 'Deputado Estadual', candidateNumber: '12888', candidateName: 'JOSUÉ RAMOS', partyNumber: '12', partyAcronym: 'PDT', partyName: 'PARTIDO DEMOCRÁTICO TRABALHISTA', votes: 23456, situation: '7º Suplente' },
    { position: 'Deputado Estadual', candidateNumber: '43999', candidateName: 'MARCOS VINÍCIUS SILVA', partyNumber: '43', partyAcronym: 'PV', partyName: 'PARTIDO VERDE', votes: 19876, situation: '8º Suplente' },
    { position: 'Deputado Estadual', candidateNumber: '50111', candidateName: 'ILMA GUIMARÃES', partyNumber: '50', partyAcronym: 'PSOL', partyName: 'PARTIDO SOCIALISMO E LIBERDADE', votes: 16543, situation: '9º Suplente' },
    { position: 'Deputado Estadual', candidateNumber: '70222', candidateName: 'MARCOS AURÉLIO RAMOS', partyNumber: '70', partyAcronym: 'AVANTE', partyName: 'AVANTE', votes: 14321, situation: '10º Suplente' },
    { position: 'Deputado Estadual', candidateNumber: '33333', candidateName: 'PEDRO LUCAS FERNANDES', partyNumber: '33', partyAcronym: 'PMN', partyName: 'PARTIDO DA MOBILIZAÇÃO NACIONAL', votes: 11234, situation: '11º Suplente' },
    { position: 'Deputado Estadual', candidateNumber: '77444', candidateName: 'RITA BARROS', partyNumber: '77', partyAcronym: 'SOLID', partyName: 'SOLIDARIEDADE', votes: 8765, situation: '12º Suplente' },
    { position: 'Deputado Estadual', candidateNumber: '36555', candidateName: 'JORGE CARVALHO', partyNumber: '36', partyAcronym: 'AGIR', partyName: 'AGIR', votes: 6543, situation: '13º Suplente' },
    { position: 'Deputado Estadual', candidateNumber: '30666', candidateName: 'ANTÔNIO BRITO NETO', partyNumber: '30', partyAcronym: 'NOVO', partyName: 'PARTIDO NOVO', votes: 4321, situation: '14º Suplente' },
];

// Nomes de bairros/localidades de São Luís e região metropolitana para mapeamento
const BAIRROS_SAO_LUIS = [
    'CENTRO', 'COHAB', 'COHAMA', 'CALHAU', 'OLHO D\'AGUA', 'TURU',
    'ANIL', 'SÃO FRANCISCO', 'RENASCENÇA', 'ANGELIM', 'CIDADE OPERÁRIA',
    'VILA PALMEIRA', 'COROADINHO', 'LIBERDADE', 'ALTO DA ESPERANÇA',
    'JORDOA', 'MAIOBÃO', 'MARACANAÚ', 'SACAVÉM', 'MONTE CASTELO',
    'BEQUIMÃO', 'ITAQUI-BACANGA', 'SANTA CRUZ', 'SÃO CRISTÓVÃO',
    'VINHAIS', 'RECANTO DOS NOBRES', 'PONTA D\'AREIA', 'JARDIM ELDORADO',
];

async function seedDeputadoData() {
    console.log('🚀 Iniciando seed de dados eleitorais - Deputado Estadual MA 2022...\n');

    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || 'governe',
    });

    await dataSource.initialize();
    console.log('✅ Conexão estabelecida\n');

    // NÃO limpar dados anteriores - apenas adicionar dados de Deputado
    // Remove apenas dados de Deputado Estadual existentes
    const deleted = await dataSource.query('DELETE FROM election_results WHERE position = $1', ['Deputado Estadual']);
    console.log('🗑️ Dados anteriores de Deputado Estadual removidos\n');

    // Dados gerais
    const electionYear = 2022;
    const round = 1;
    const municipality = 'SÃO LUÍS'; // Capital do Maranhão
    const state = 'MA';
    const zones = [83, 84, 85, 86]; // Zonas eleitorais de São Luís - MA
    const sectionsPerZone = 150;

    let totalRecords = 0;

    for (const candidate of deputadoEstadualData) {
        let remainingVotes = candidate.votes;

        // Distribuir votos por zona com pesos variados para criar padrões geográficos
        const zoneWeights = candidate.candidateNumber === '40000'
            // Adelmo Soares: forte nas zonas 83 e 84 (centro e periferia)
            ? [0.35, 0.30, 0.20, 0.15]
            // Outros candidatos: distribuição mais uniforme com variação
            : [
                0.20 + Math.random() * 0.15,
                0.20 + Math.random() * 0.15,
                0.20 + Math.random() * 0.10,
                0, // será o restante
            ].map((w, i, arr) => {
                if (i === arr.length - 1) return 1 - arr.slice(0, -1).reduce((s, v) => s + v, 0);
                return w;
            });

        for (let zi = 0; zi < zones.length; zi++) {
            const zone = zones[zi];
            const zoneVotes = zi === zones.length - 1
                ? remainingVotes
                : Math.floor(candidate.votes * zoneWeights[zi]);

            remainingVotes -= (zi === zones.length - 1 ? zoneVotes : Math.floor(candidate.votes * zoneWeights[zi]));

            // Distribuir pelos seções
            const numSections = Math.floor(sectionsPerZone * (0.3 + Math.random() * 0.4));
            let sectionRemainingVotes = zoneVotes;

            for (let s = 1; s <= numSections && sectionRemainingVotes > 0; s++) {
                const sectionVotes = s === numSections
                    ? sectionRemainingVotes
                    : Math.max(1, Math.floor(sectionRemainingVotes / (numSections - s + 1) * (0.3 + Math.random() * 1.4)));

                if (sectionVotes <= 0) continue;

                const actualVotes = Math.min(sectionVotes, sectionRemainingVotes);

                await dataSource.query(`
                    INSERT INTO election_results 
                    ("electionYear", round, zone, section, position, "candidateNumber", "candidateName", 
                     "partyNumber", "partyAcronym", "partyName", votes, municipality, state)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                `, [
                    electionYear, round, zone, s,
                    candidate.position, candidate.candidateNumber, candidate.candidateName,
                    candidate.partyNumber, candidate.partyAcronym, candidate.partyName,
                    actualVotes, municipality, state
                ]);

                sectionRemainingVotes -= actualVotes;
                totalRecords++;
            }
        }

        console.log(`  ✓ ${candidate.candidateNumber} - ${candidate.candidateName}: ${candidate.votes.toLocaleString('pt-BR')} votos (${candidate.situation})`);
    }

    // Importar locais de votação para os bairros
    console.log('\n📍 Mapeando zonas para bairros...');

    // Verificar se a tabela voting_locations existe
    try {
        const tableExists = await dataSource.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'voting_locations'
            );
        `);

        if (tableExists[0]?.exists) {
            // Limpar locais para as zonas de MA
            await dataSource.query('DELETE FROM voting_locations WHERE zone IN ($1, $2, $3, $4)', zones);

            // Criar locais de votação para cada zona/seção
            let locationCount = 0;
            for (const zone of zones) {
                const numSections = sectionsPerZone;
                for (let s = 1; s <= numSections; s++) {
                    const bairro = BAIRROS_SAO_LUIS[Math.floor(Math.random() * BAIRROS_SAO_LUIS.length)];
                    const localName = `ESCOLA ${['MUNICIPAL', 'ESTADUAL', 'FEDERAL'][Math.floor(Math.random() * 3)]} ${['DOM PEDRO', 'JOSÉ SARNEY', 'NEWTON BELLO', 'RUI BARBOSA', 'BANDEIRA TRIBUZZI', 'JOSUÉ MONTELLO', 'FERREIRA GULLAR'][Math.floor(Math.random() * 7)]}`;

                    await dataSource.query(`
                        INSERT INTO voting_locations (zone, section, "localName", neighborhood, address)
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT DO NOTHING
                    `, [zone, s, localName, bairro, `Rua ${bairro}, ${Math.floor(Math.random() * 500) + 1}`]);
                    locationCount++;
                }
            }
            console.log(`  ✓ ${locationCount} locais de votação mapeados`);
        } else {
            console.log('  ⚠️ Tabela voting_locations não encontrada - pulando mapeamento');
        }
    } catch (err) {
        console.log('  ⚠️ Erro ao mapear bairros (não crítico):', (err as Error).message);
    }

    console.log(`\n✅ Seed concluído! ${totalRecords} registros de Deputado Estadual inseridos`);
    console.log('\n📊 Resumo:');

    const summary = await dataSource.query(`
        SELECT position, COUNT(DISTINCT "candidateNumber") as candidates, SUM(votes) as total_votes
        FROM election_results
        GROUP BY position
        ORDER BY position
    `);

    summary.forEach((s: any) => {
        console.log(`   - ${s.position}: ${s.candidates} candidatos, ${parseInt(s.total_votes).toLocaleString('pt-BR')} votos`);
    });

    // Mostrar dados do Adelmo Soares
    console.log('\n🎯 Dados de Adelmo Soares:');
    const adelmo = await dataSource.query(`
        SELECT 
            "candidateName", "partyAcronym", "candidateNumber",
            SUM(votes) as total_votes,
            COUNT(DISTINCT zone) as zones_count,
            COUNT(*) as sections_count
        FROM election_results 
        WHERE "candidateNumber" = '40000' AND position = 'Deputado Estadual'
        GROUP BY "candidateName", "partyAcronym", "candidateNumber"
    `);

    if (adelmo.length > 0) {
        console.log(`   Nome: ${adelmo[0].candidateName}`);
        console.log(`   Partido: ${adelmo[0].partyAcronym}`);
        console.log(`   Número: ${adelmo[0].candidateNumber}`);
        console.log(`   Total de Votos: ${parseInt(adelmo[0].total_votes).toLocaleString('pt-BR')}`);
        console.log(`   Zonas: ${adelmo[0].zones_count}`);
        console.log(`   Seções: ${adelmo[0].sections_count}`);
    }

    await dataSource.destroy();
    console.log('\n🔌 Conexão encerrada');
}

seedDeputadoData().catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
});
