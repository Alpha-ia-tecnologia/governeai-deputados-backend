/**
 * Script para popular dados eleitorais de Parnaíba-PI 2024 (1º Turno)
 * Dados extraídos do Relatório Oficial do TSE
 * Execução: npx ts-node src/scripts/seed-election-data.ts
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

// Dados de Prefeito
const prefeitoData: ElectionData[] = [
    { position: 'Prefeito', candidateNumber: '11', candidateName: 'FRANCISCO EMANUEL CUNHA DE BRITO', partyNumber: '11', partyAcronym: 'PP', partyName: 'PROGRESSISTAS', votes: 54393, situation: 'Eleito' },
    { position: 'Prefeito', candidateNumber: '15', candidateName: 'JOSÉ HÉLIO DE CARVALHO OLIVEIRA', partyNumber: '15', partyAcronym: 'MDB', partyName: 'MOVIMENTO DEMOCRÁTICO BRASILEIRO', votes: 27741, situation: 'Não eleito' },
    { position: 'Prefeito', candidateNumber: '55', candidateName: 'JOSE HAMILTON FURTADO CASTELLO BRANCO', partyNumber: '55', partyAcronym: 'PSD', partyName: 'PARTIDO SOCIAL DEMOCRÁTICO', votes: 9692, situation: 'Não eleito' },
    { position: 'Prefeito', candidateNumber: '27', candidateName: 'ERIVELTON FONTENELE', partyNumber: '27', partyAcronym: 'DC', partyName: 'DEMOCRACIA CRISTÃ', votes: 222, situation: 'Não eleito' },
];

// Dados de Vereadores (Eleitos e Suplentes)
const vereadorData: ElectionData[] = [
    // REPUBLICANOS (10)
    { position: 'Vereador', candidateNumber: '10777', candidateName: 'DANIEL JACKSON ARAUJO DE SOUZA', partyNumber: '10', partyAcronym: 'REPUBLICANOS', partyName: 'REPUBLICANOS', votes: 2276, situation: 'Eleito por QP' },
    { position: 'Vereador', candidateNumber: '10369', candidateName: 'RENATO BITTENCOURT DOS SANTOS', partyNumber: '10', partyAcronym: 'REPUBLICANOS', partyName: 'REPUBLICANOS', votes: 2045, situation: 'Eleito por QP' },
    { position: 'Vereador', candidateNumber: '10456', candidateName: 'TAYLON OLIVEIRA DE ANDRADES', partyNumber: '10', partyAcronym: 'REPUBLICANOS', partyName: 'REPUBLICANOS', votes: 1533, situation: 'Eleito por média' },
    { position: 'Vereador', candidateNumber: '10111', candidateName: 'JOSE ALVES DE SOUZA NETO', partyNumber: '10', partyAcronym: 'REPUBLICANOS', partyName: 'REPUBLICANOS', votes: 1493, situation: '1º Suplente' },
    { position: 'Vereador', candidateNumber: '10222', candidateName: 'JÚLIO CÉSAR DA CUNHA SOARES', partyNumber: '10', partyAcronym: 'REPUBLICANOS', partyName: 'REPUBLICANOS', votes: 1245, situation: '2º Suplente' },
    { position: 'Vereador', candidateNumber: '10123', candidateName: 'BERNARDO DE CLARAVAL NASCIMENTO ROCHA', partyNumber: '10', partyAcronym: 'REPUBLICANOS', partyName: 'REPUBLICANOS', votes: 1080, situation: '3º Suplente' },
    { position: 'Vereador', candidateNumber: '10999', candidateName: 'ANTONIO MARCOS DO NASCIMENTO OLIVEIRA', partyNumber: '10', partyAcronym: 'REPUBLICANOS', partyName: 'REPUBLICANOS', votes: 959, situation: '4º Suplente' },
    { position: 'Vereador', candidateNumber: '10120', candidateName: 'RAIMUNDO NONATO CARDOSO CARVALHO', partyNumber: '10', partyAcronym: 'REPUBLICANOS', partyName: 'REPUBLICANOS', votes: 733, situation: '5º Suplente' },
    { position: 'Vereador', candidateNumber: '10115', candidateName: 'EDSON MEDEIROS RODRIGUES NETTO', partyNumber: '10', partyAcronym: 'REPUBLICANOS', partyName: 'REPUBLICANOS', votes: 412, situation: '6º Suplente' },
    { position: 'Vereador', candidateNumber: '10555', candidateName: 'THIAGO PINHEIRO CARVALHO', partyNumber: '10', partyAcronym: 'REPUBLICANOS', partyName: 'REPUBLICANOS', votes: 357, situation: '7º Suplente' },
    { position: 'Vereador', candidateNumber: '10000', candidateName: 'VALDENIZO DA ROCHA OLIVEIRA', partyNumber: '10', partyAcronym: 'REPUBLICANOS', partyName: 'REPUBLICANOS', votes: 343, situation: '8º Suplente' },
    { position: 'Vereador', candidateNumber: '10321', candidateName: 'THIAGO GALDINO DA SILVA', partyNumber: '10', partyAcronym: 'REPUBLICANOS', partyName: 'REPUBLICANOS', votes: 158, situation: '9º Suplente' },
    { position: 'Vereador', candidateNumber: '10333', candidateName: 'MANOEL PEREIRA VERAS', partyNumber: '10', partyAcronym: 'REPUBLICANOS', partyName: 'REPUBLICANOS', votes: 113, situation: '10º Suplente' },

    // PP (11)
    { position: 'Vereador', candidateNumber: '11678', candidateName: 'JOÃO BATISTA DOS SANTOS FILHO', partyNumber: '11', partyAcronym: 'PP', partyName: 'PROGRESSISTAS', votes: 2192, situation: 'Eleito por QP' },
    { position: 'Vereador', candidateNumber: '11456', candidateName: 'FRANCISCA DAS CHAGAS CASTELO BRANCO NETA', partyNumber: '11', partyAcronym: 'PP', partyName: 'PROGRESSISTAS', votes: 1787, situation: 'Eleito por QP' },
    { position: 'Vereador', candidateNumber: '11000', candidateName: 'EDCARLOS GOUVEIA DA SILVA', partyNumber: '11', partyAcronym: 'PP', partyName: 'PROGRESSISTAS', votes: 1593, situation: 'Eleito por média' },
    { position: 'Vereador', candidateNumber: '11123', candidateName: 'FRANCISCO ASTROGILDO FERNANDES LIMA', partyNumber: '11', partyAcronym: 'PP', partyName: 'PROGRESSISTAS', votes: 1396, situation: '1º Suplente' },
    { position: 'Vereador', candidateNumber: '11007', candidateName: 'ANTONIO AROLDO DA CUNHA', partyNumber: '11', partyAcronym: 'PP', partyName: 'PROGRESSISTAS', votes: 1025, situation: '2º Suplente' },
    { position: 'Vereador', candidateNumber: '11610', candidateName: 'GUSTAVO COSTA DE LIMA E SILVA', partyNumber: '11', partyAcronym: 'PP', partyName: 'PROGRESSISTAS', votes: 939, situation: '3º Suplente' },
    { position: 'Vereador', candidateNumber: '11789', candidateName: 'FRANCISCO DE ASSIS PEREIRA DA PAZ', partyNumber: '11', partyAcronym: 'PP', partyName: 'PROGRESSISTAS', votes: 892, situation: '4º Suplente' },
    { position: 'Vereador', candidateNumber: '11567', candidateName: 'JHONNATAM CARVALHO CALDAS DE SOUSA', partyNumber: '11', partyAcronym: 'PP', partyName: 'PROGRESSISTAS', votes: 677, situation: '5º Suplente' },

    // MDB (15)
    { position: 'Vereador', candidateNumber: '15222', candidateName: 'JOSE ALVES DE SOUSA FILHO', partyNumber: '15', partyAcronym: 'MDB', partyName: 'MOVIMENTO DEMOCRÁTICO BRASILEIRO', votes: 2086, situation: 'Eleito por QP' },
    { position: 'Vereador', candidateNumber: '15130', candidateName: 'MARCOS SAMARONNE FERREIRA DE OLIVEIRA', partyNumber: '15', partyAcronym: 'MDB', partyName: 'MOVIMENTO DEMOCRÁTICO BRASILEIRO', votes: 2032, situation: 'Eleito por QP' },
    { position: 'Vereador', candidateNumber: '15111', candidateName: 'JOAO BATISTA OLIVEIRA DOS SANTOS', partyNumber: '15', partyAcronym: 'MDB', partyName: 'MOVIMENTO DEMOCRÁTICO BRASILEIRO', votes: 1970, situation: 'Eleito por QP' },
    { position: 'Vereador', candidateNumber: '15000', candidateName: 'CARLSON AUGUSTO CORNELIO PESSOA', partyNumber: '15', partyAcronym: 'MDB', partyName: 'MOVIMENTO DEMOCRÁTICO BRASILEIRO', votes: 1541, situation: '1º Suplente' },
    { position: 'Vereador', candidateNumber: '15333', candidateName: 'ANDRE SILVA NEVES', partyNumber: '15', partyAcronym: 'MDB', partyName: 'MOVIMENTO DEMOCRÁTICO BRASILEIRO', votes: 1244, situation: '2º Suplente' },
    { position: 'Vereador', candidateNumber: '15777', candidateName: 'DEUSIMAR DO SOCORRO BRITO DE FARIAS', partyNumber: '15', partyAcronym: 'MDB', partyName: 'MOVIMENTO DEMOCRÁTICO BRASILEIRO', votes: 1105, situation: '3º Suplente' },
    { position: 'Vereador', candidateNumber: '15999', candidateName: 'THIAGO MENEZES DO AMARAL GOMES', partyNumber: '15', partyAcronym: 'MDB', partyName: 'MOVIMENTO DEMOCRÁTICO BRASILEIRO', votes: 1071, situation: '4º Suplente' },
    { position: 'Vereador', candidateNumber: '15789', candidateName: 'ANTONIO FORTES DINIZ', partyNumber: '15', partyAcronym: 'MDB', partyName: 'MOVIMENTO DEMOCRÁTICO BRASILEIRO', votes: 982, situation: '5º Suplente' },

    // PODEMOS (20)
    { position: 'Vereador', candidateNumber: '20000', candidateName: 'MAKSUEL JOSÉ GOMES BRANDÃO', partyNumber: '20', partyAcronym: 'PODE', partyName: 'PODEMOS', votes: 1120, situation: 'Eleito por QP' },
    { position: 'Vereador', candidateNumber: '20123', candidateName: 'JOSE MARQUES DE SOUSA JUNIOR', partyNumber: '20', partyAcronym: 'PODE', partyName: 'PODEMOS', votes: 738, situation: '1º Suplente' },
    { position: 'Vereador', candidateNumber: '20130', candidateName: 'ROBERTO WILLIAM RUFINO DE SOUSA', partyNumber: '20', partyAcronym: 'PODE', partyName: 'PODEMOS', votes: 699, situation: '2º Suplente' },
    { position: 'Vereador', candidateNumber: '20111', candidateName: 'LUIZ ANTONIO CAMPOS DE ARAUJO', partyNumber: '20', partyAcronym: 'PODE', partyName: 'PODEMOS', votes: 577, situation: '3º Suplente' },

    // PL (22)
    { position: 'Vereador', candidateNumber: '22322', candidateName: 'FRANCISCO JOSÉ DE OLIVEIRA PEREIRA', partyNumber: '22', partyAcronym: 'PL', partyName: 'PARTIDO LIBERAL', votes: 1375, situation: 'Eleito por QP' },
    { position: 'Vereador', candidateNumber: '22456', candidateName: 'BRUNO VASCONCELOS CUNHA', partyNumber: '22', partyAcronym: 'PL', partyName: 'PARTIDO LIBERAL', votes: 1047, situation: 'Eleito por média' },
    { position: 'Vereador', candidateNumber: '22333', candidateName: 'THICIANO RIBEIRO DA CRUZ', partyNumber: '22', partyAcronym: 'PL', partyName: 'PARTIDO LIBERAL', votes: 986, situation: '1º Suplente' },
    { position: 'Vereador', candidateNumber: '22222', candidateName: 'JOÃO RODRIGO DE LUNA E SILVA', partyNumber: '22', partyAcronym: 'PL', partyName: 'PARTIDO LIBERAL', votes: 927, situation: '2º Suplente' },

    // UNIÃO (44)
    { position: 'Vereador', candidateNumber: '44123', candidateName: 'ANTONIO JOSE BATISTA FILHO', partyNumber: '44', partyAcronym: 'UNIÃO', partyName: 'UNIÃO BRASIL', votes: 2420, situation: 'Eleito por QP' },
    { position: 'Vereador', candidateNumber: '44456', candidateName: 'VALÉRIO AQUINO GOMES', partyNumber: '44', partyAcronym: 'UNIÃO', partyName: 'UNIÃO BRASIL', votes: 1640, situation: 'Eleito por média' },

    // FE BRASIL - PT/PCdoB/PV (13, 65, 43)
    { position: 'Vereador', candidateNumber: '13123', candidateName: 'MARCOS ANTONIO DE CARVALHO', partyNumber: '13', partyAcronym: 'PT', partyName: 'PARTIDO DOS TRABALHADORES', votes: 1980, situation: 'Eleito por QP' },
    { position: 'Vereador', candidateNumber: '65000', candidateName: 'RAIMUNDO BANDEIRA DA SILVA', partyNumber: '65', partyAcronym: 'PCdoB', partyName: 'PARTIDO COMUNISTA DO BRASIL', votes: 1750, situation: 'Eleito por QP' },

    // PSOL REDE (50, 18)
    { position: 'Vereador', candidateNumber: '50123', candidateName: 'MARIA DAS GRAÇAS OLIVEIRA', partyNumber: '50', partyAcronym: 'PSOL', partyName: 'PARTIDO SOCIALISMO E LIBERDADE', votes: 2100, situation: 'Eleito por QP' },
    { position: 'Vereador', candidateNumber: '18000', candidateName: 'CARLOS EDUARDO RIOS', partyNumber: '18', partyAcronym: 'REDE', partyName: 'REDE SUSTENTABILIDADE', votes: 1450, situation: 'Eleito por média' },
];

async function seedElectionData() {
    console.log('🚀 Iniciando seed de dados eleitorais de Parnaíba-PI...\n');

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

    // Limpar dados anteriores
    await dataSource.query('DELETE FROM election_results');
    console.log('🗑️ Dados anteriores removidos\n');

    // Dados gerais do município
    const electionYear = 2024;
    const round = 1;
    const municipality = 'PARNAÍBA';
    const state = 'PI';
    const zones = [3, 4]; // Zonas eleitorais de Parnaíba
    const sectionsPerZone = 200; // Aproximadamente

    let totalRecords = 0;
    const allData = [...prefeitoData, ...vereadorData];

    for (const candidate of allData) {
        // Distribuir votos aleatoriamente pelas zonas e seções
        let remainingVotes = candidate.votes;

        for (const zone of zones) {
            // Dividir votos pela zona
            const zoneVotes = zone === zones[0]
                ? Math.floor(remainingVotes * 0.55) // 55% para zona principal
                : remainingVotes - Math.floor(remainingVotes * 0.55);

            // Dividir pelos seções
            const numSections = Math.floor(sectionsPerZone / 2);
            let sectionRemainingVotes = zoneVotes;

            for (let s = 1; s <= numSections && sectionRemainingVotes > 0; s++) {
                const sectionVotes = s === numSections
                    ? sectionRemainingVotes
                    : Math.floor(sectionRemainingVotes / (numSections - s + 1) * (0.5 + Math.random()));

                if (sectionVotes <= 0) continue;

                await dataSource.query(`
                    INSERT INTO election_results 
                    ("electionYear", round, zone, section, position, "candidateNumber", "candidateName", 
                     "partyNumber", "partyAcronym", "partyName", votes, municipality, state)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                `, [
                    electionYear, round, zone, s,
                    candidate.position, candidate.candidateNumber, candidate.candidateName,
                    candidate.partyNumber, candidate.partyAcronym, candidate.partyName,
                    sectionVotes, municipality, state
                ]);

                sectionRemainingVotes -= sectionVotes;
                totalRecords++;
            }
        }

        console.log(`  ✓ ${candidate.candidateNumber} - ${candidate.candidateName}: ${candidate.votes} votos`);
    }

    console.log(`\n✅ Seed concluído! ${totalRecords} registros inseridos`);
    console.log('\n📊 Resumo:');

    const summary = await dataSource.query(`
        SELECT position, COUNT(DISTINCT "candidateNumber") as candidates, SUM(votes) as total_votes
        FROM election_results
        GROUP BY position
    `);

    summary.forEach((s: any) => {
        console.log(`   - ${s.position}: ${s.candidates} candidatos, ${parseInt(s.total_votes).toLocaleString('pt-BR')} votos`);
    });

    await dataSource.destroy();
    console.log('\n🔌 Conexão encerrada');
}

seedElectionData().catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
});
