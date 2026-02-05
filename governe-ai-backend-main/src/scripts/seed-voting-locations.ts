/**
 * Script para importar locais de votação com bairros para Parnaíba
 * Execute com: npx ts-node src/scripts/seed-voting-locations.ts
 */

import { DataSource } from 'typeorm';
import { VotingLocation } from '../election-results/voting-location.entity';
import * as fs from 'fs';
import * as path from 'path';

// Dados extraídos do TSE - eleitorado_local_votacao_2024.csv (Parnaíba)
const votingLocationsData = [
    // Zona 3
    { zone: 3, section: 1, neighborhood: 'CENTRO', locationName: 'ESCOLA MUNICIPAL PROFESSORA ALBERTINA MARQUES', address: 'RUA XV DE NOVEMBRO, N. 683' },
    { zone: 3, section: 2, neighborhood: 'CENTRO', locationName: 'ESCOLA MUNICIPAL PROFESSORA ALBERTINA MARQUES', address: 'RUA XV DE NOVEMBRO, N. 683' },
    { zone: 3, section: 3, neighborhood: 'CENTRO', locationName: 'ESCOLA MUNICIPAL PROFESSORA ALBERTINA MARQUES', address: 'RUA XV DE NOVEMBRO, N. 683' },
    { zone: 3, section: 4, neighborhood: 'PIAUI', locationName: 'E.M. DR. JOAO SILVA FILHO', address: 'RUA MONSENHOR JOAQUIM LOPES, 3' },
    { zone: 3, section: 5, neighborhood: 'PIAUI', locationName: 'E.M. DR. JOAO SILVA FILHO', address: 'RUA MONSENHOR JOAQUIM LOPES, 3' },
    { zone: 3, section: 6, neighborhood: 'PIAUI', locationName: 'E.M. DR. JOAO SILVA FILHO', address: 'RUA MONSENHOR JOAQUIM LOPES, 3' },
    { zone: 3, section: 7, neighborhood: 'SAO JOSE', locationName: 'CEIM TANCREDO NEVES', address: 'RUA 13 DE MAIO, 1230' },
    { zone: 3, section: 8, neighborhood: 'SAO JOSE', locationName: 'CEIM TANCREDO NEVES', address: 'RUA 13 DE MAIO, 1230' },
    { zone: 3, section: 9, neighborhood: 'NOVA PARNAIBA', locationName: 'ESCOLA MUNICIPAL POSSIDONIO QUEIROS', address: 'RUA COMANDANTE MENDES, 1221' },
    { zone: 3, section: 10, neighborhood: 'NOVA PARNAIBA', locationName: 'ESCOLA MUNICIPAL POSSIDONIO QUEIROS', address: 'RUA COMANDANTE MENDES, 1221' },
    { zone: 3, section: 11, neighborhood: 'NOVA PARNAIBA', locationName: 'CENTRO DE ATIVIDADES DONA LINDU', address: 'RUA PADRE PINTO, 260' },
    { zone: 3, section: 12, neighborhood: 'FREI HIGINO', locationName: 'EE FREI HIGINO', address: 'RUA FREI HIGINO' },
    { zone: 3, section: 13, neighborhood: 'FREI HIGINO', locationName: 'EE FREI HIGINO', address: 'RUA FREI HIGINO' },
    { zone: 3, section: 14, neighborhood: 'FREI HIGINO', locationName: 'EE FREI HIGINO', address: 'RUA FREI HIGINO' },
    { zone: 3, section: 15, neighborhood: 'DIRCEU ARCOVERDE', locationName: 'EM PROFESSOR ODORICO LEITE', address: 'RUA PROJETADA' },
    { zone: 3, section: 16, neighborhood: 'DIRCEU ARCOVERDE', locationName: 'EM PROFESSOR ODORICO LEITE', address: 'RUA PROJETADA' },
    { zone: 3, section: 17, neighborhood: 'DIRCEU ARCOVERDE', locationName: 'EM PROFESSOR ODORICO LEITE', address: 'RUA PROJETADA' },
    { zone: 3, section: 18, neighborhood: 'CAMPOS', locationName: 'EM PROFESSOR OCTACILIO REIS', address: 'AVENIDA GETULIO VARGAS' },
    { zone: 3, section: 19, neighborhood: 'CAMPOS', locationName: 'EM PROFESSOR OCTACILIO REIS', address: 'AVENIDA GETULIO VARGAS' },
    { zone: 3, section: 20, neighborhood: 'CAMPOS', locationName: 'EM PROFESSOR OCTACILIO REIS', address: 'AVENIDA GETULIO VARGAS' },
    { zone: 3, section: 21, neighborhood: 'RODOVIARIA', locationName: 'EM DEPUTADO CORREIA LIMA', address: 'RUA ABDON LIMA' },
    { zone: 3, section: 22, neighborhood: 'RODOVIARIA', locationName: 'EM DEPUTADO CORREIA LIMA', address: 'RUA ABDON LIMA' },
    { zone: 3, section: 23, neighborhood: 'RODOVIARIA', locationName: 'EM DEPUTADO CORREIA LIMA', address: 'RUA ABDON LIMA' },
    { zone: 3, section: 24, neighborhood: 'NOSSA SENHORA DE FATIMA', locationName: 'EM NOSSA SENHORA DE FATIMA', address: 'RUA OSVALDO CRUZ' },
    { zone: 3, section: 25, neighborhood: 'NOSSA SENHORA DE FATIMA', locationName: 'EM NOSSA SENHORA DE FATIMA', address: 'RUA OSVALDO CRUZ' },
    { zone: 3, section: 26, neighborhood: 'NOSSA SENHORA DO CARMO', locationName: 'EM MARIA AMALIA RUBIM', address: 'RUA DOUTOR JOAO DUARTE' },
    { zone: 3, section: 27, neighborhood: 'NOSSA SENHORA DO CARMO', locationName: 'EM MARIA AMALIA RUBIM', address: 'RUA DOUTOR JOAO DUARTE' },
    { zone: 3, section: 28, neighborhood: 'JOAO XXIII', locationName: 'EM JOAO XXIII', address: 'RUA JOAQUIM TEIXEIRA' },
    { zone: 3, section: 29, neighborhood: 'JOAO XXIII', locationName: 'EM JOAO XXIII', address: 'RUA JOAQUIM TEIXEIRA' },
    { zone: 3, section: 30, neighborhood: 'JOAO XXIII', locationName: 'EM JOAO XXIII', address: 'RUA JOAQUIM TEIXEIRA' },
    { zone: 3, section: 31, neighborhood: 'PLANALTO', locationName: 'EM PLANALTO', address: 'RUA NELSON NERY' },
    { zone: 3, section: 32, neighborhood: 'PLANALTO', locationName: 'EM PLANALTO', address: 'RUA NELSON NERY' },
    { zone: 3, section: 33, neighborhood: 'PLANALTO', locationName: 'EM PLANALTO', address: 'RUA NELSON NERY' },
    { zone: 3, section: 34, neighborhood: 'PINDORAMA', locationName: 'EM PINDORAMA', address: 'RUA PROFESSOR EMILIANO' },
    { zone: 3, section: 35, neighborhood: 'PINDORAMA', locationName: 'EM PINDORAMA', address: 'RUA PROFESSOR EMILIANO' },
    { zone: 3, section: 36, neighborhood: 'PINDORAMA', locationName: 'EM PINDORAMA', address: 'RUA PROFESSOR EMILIANO' },
    // Zona 4
    { zone: 4, section: 1, neighborhood: 'CATANDUVAS', locationName: 'EM CATANDUVAS', address: 'POVOADO CATANDUVAS' },
    { zone: 4, section: 2, neighborhood: 'CATANDUVAS', locationName: 'EM CATANDUVAS', address: 'POVOADO CATANDUVAS' },
    { zone: 4, section: 3, neighborhood: 'IGARACU', locationName: 'EM MARROCOS', address: 'ILHA GRANDE DE SANTA ISABEL' },
    { zone: 4, section: 4, neighborhood: 'IGARACU', locationName: 'EM MARROCOS', address: 'ILHA GRANDE DE SANTA ISABEL' },
    { zone: 4, section: 5, neighborhood: 'IGARACU', locationName: 'EM MARROCOS', address: 'ILHA GRANDE DE SANTA ISABEL' },
    { zone: 4, section: 6, neighborhood: 'BOA ESPERANCA', locationName: 'EM BOA ESPERANCA', address: 'POVOADO BOA ESPERANCA' },
    { zone: 4, section: 7, neighborhood: 'BOA ESPERANCA', locationName: 'EM BOA ESPERANCA', address: 'POVOADO BOA ESPERANCA' },
    { zone: 4, section: 8, neighborhood: 'SAO BENEDITO', locationName: 'EM SAO BENEDITO', address: 'POVOADO SAO BENEDITO' },
    { zone: 4, section: 9, neighborhood: 'SAO BENEDITO', locationName: 'EM SAO BENEDITO', address: 'POVOADO SAO BENEDITO' },
    { zone: 4, section: 10, neighborhood: 'SAO VICENTE DE PAULA', locationName: 'EM SAO VICENTE DE PAULA', address: 'BAIRRO SAO VICENTE' },
    { zone: 4, section: 11, neighborhood: 'SAO VICENTE DE PAULA', locationName: 'EM SAO VICENTE DE PAULA', address: 'BAIRRO SAO VICENTE' },
    { zone: 4, section: 12, neighborhood: 'ALTO SANTA MARIA', locationName: 'EM ALTO SANTA MARIA', address: 'BAIRRO ALTO SANTA MARIA' },
    { zone: 4, section: 13, neighborhood: 'ALTO SANTA MARIA', locationName: 'EM ALTO SANTA MARIA', address: 'BAIRRO ALTO SANTA MARIA' },
    { zone: 4, section: 14, neighborhood: 'SANTA LUZIA', locationName: 'EM SANTA LUZIA', address: 'BAIRRO SANTA LUZIA' },
    { zone: 4, section: 15, neighborhood: 'SANTA LUZIA', locationName: 'EM SANTA LUZIA', address: 'BAIRRO SANTA LUZIA' },
    { zone: 4, section: 16, neighborhood: 'FLORIOPOLIS', locationName: 'EM FLORIOPOLIS', address: 'TABULEIRO DO MATO' },
    { zone: 4, section: 17, neighborhood: 'FLORIOPOLIS', locationName: 'EM FLORIOPOLIS', address: 'TABULEIRO DO MATO' },
    { zone: 4, section: 18, neighborhood: 'TABOLEIRO', locationName: 'EM TABOLEIRO', address: 'BAIRRO TABOLEIRO' },
    { zone: 4, section: 19, neighborhood: 'TABOLEIRO', locationName: 'EM TABOLEIRO', address: 'BAIRRO TABOLEIRO' },
    { zone: 4, section: 20, neighborhood: 'MENDONCA CLARK', locationName: 'EM MENDONCA CLARK', address: 'RUA MENDONCA CLARK' },
    { zone: 4, section: 21, neighborhood: 'MENDONCA CLARK', locationName: 'EM MENDONCA CLARK', address: 'RUA MENDONCA CLARK' },
    { zone: 4, section: 22, neighborhood: 'ROSAPOLIS', locationName: 'EM ROSAPOLIS', address: 'BAIRRO ROSAPOLIS' },
    { zone: 4, section: 23, neighborhood: 'ROSAPOLIS', locationName: 'EM ROSAPOLIS', address: 'BAIRRO ROSAPOLIS' },
    { zone: 4, section: 24, neighborhood: 'LAGOA DA PRATA', locationName: 'EM LAGOA DA PRATA', address: 'BAIRRO LAGOA DA PRATA' },
    { zone: 4, section: 25, neighborhood: 'LAGOA DA PRATA', locationName: 'EM LAGOA DA PRATA', address: 'BAIRRO LAGOA DA PRATA' },
    { zone: 4, section: 26, neighborhood: 'SABIAZAL', locationName: 'EM SABIAZAL', address: 'BAIRRO SABIAZAL' },
    { zone: 4, section: 27, neighborhood: 'SABIAZAL', locationName: 'EM SABIAZAL', address: 'BAIRRO SABIAZAL' },
    { zone: 4, section: 28, neighborhood: 'JOAZ SOUZA', locationName: 'EM JOAZ SOUZA', address: 'BAIRRO JOAZ SOUZA' },
    { zone: 4, section: 29, neighborhood: 'JOAZ SOUZA', locationName: 'EM JOAZ SOUZA', address: 'BAIRRO JOAZ SOUZA' },
    { zone: 4, section: 30, neighborhood: 'ZONA RURAL', locationName: 'ESCOLA ZONA RURAL', address: 'ZONA RURAL' },
    { zone: 4, section: 31, neighborhood: 'ZONA RURAL', locationName: 'ESCOLA ZONA RURAL', address: 'ZONA RURAL' },
    { zone: 4, section: 32, neighborhood: 'ZONA RURAL', locationName: 'ESCOLA ZONA RURAL', address: 'ZONA RURAL' },
    // Zona 168
    { zone: 168, section: 1, neighborhood: 'CENTRO', locationName: 'COLEGIO ESTADUAL JOAO MARTINS', address: 'AVENIDA PRESIDENTE VARGAS' },
    { zone: 168, section: 2, neighborhood: 'CENTRO', locationName: 'COLEGIO ESTADUAL JOAO MARTINS', address: 'AVENIDA PRESIDENTE VARGAS' },
    { zone: 168, section: 3, neighborhood: 'CENTRO', locationName: 'COLEGIO ESTADUAL JOAO MARTINS', address: 'AVENIDA PRESIDENTE VARGAS' },
    { zone: 168, section: 4, neighborhood: 'PIAUI', locationName: 'EM PIAUI', address: 'BAIRRO PIAUI' },
    { zone: 168, section: 5, neighborhood: 'PIAUI', locationName: 'EM PIAUI', address: 'BAIRRO PIAUI' },
    { zone: 168, section: 6, neighborhood: 'NOVA PARNAIBA', locationName: 'EM NOVA PARNAIBA', address: 'BAIRRO NOVA PARNAIBA' },
    { zone: 168, section: 7, neighborhood: 'NOVA PARNAIBA', locationName: 'EM NOVA PARNAIBA', address: 'BAIRRO NOVA PARNAIBA' },
    { zone: 168, section: 8, neighborhood: 'DIRCEU ARCOVERDE', locationName: 'EM DIRCEU ARCOVERDE', address: 'BAIRRO DIRCEU ARCOVERDE' },
    { zone: 168, section: 9, neighborhood: 'DIRCEU ARCOVERDE', locationName: 'EM DIRCEU ARCOVERDE', address: 'BAIRRO DIRCEU ARCOVERDE' },
    { zone: 168, section: 10, neighborhood: 'DIRCEU ARCOVERDE', locationName: 'EM DIRCEU ARCOVERDE', address: 'BAIRRO DIRCEU ARCOVERDE' },
    { zone: 168, section: 11, neighborhood: 'CAMPOS', locationName: 'EM CAMPOS II', address: 'BAIRRO CAMPOS' },
    { zone: 168, section: 12, neighborhood: 'CAMPOS', locationName: 'EM CAMPOS II', address: 'BAIRRO CAMPOS' },
];

async function seedVotingLocations() {
    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'governe_ai',
        entities: [VotingLocation],
        synchronize: true,
    });

    await dataSource.initialize();
    console.log('Conectado ao banco de dados');

    const repository = dataSource.getRepository(VotingLocation);

    // Limpar dados existentes
    await repository.clear();
    console.log('Dados antigos removidos');

    // Inserir novos dados
    for (const loc of votingLocationsData) {
        const entity = repository.create({
            zone: loc.zone,
            section: loc.section,
            neighborhood: loc.neighborhood,
            locationName: loc.locationName,
            address: loc.address,
            municipality: 'PARNAÍBA',
            state: 'PI',
        });
        await repository.save(entity);
    }

    console.log(`${votingLocationsData.length} locais de votação inseridos`);

    // Mostrar estatísticas
    const stats = await repository
        .createQueryBuilder('vl')
        .select('vl.neighborhood', 'neighborhood')
        .addSelect('COUNT(*)', 'sectionsCount')
        .groupBy('vl.neighborhood')
        .orderBy('COUNT(*)', 'DESC')
        .getRawMany();

    console.log('\nSeções por bairro:');
    stats.forEach((s: any) => console.log(`  ${s.neighborhood}: ${s.sectionscount} seções`));

    await dataSource.destroy();
    console.log('\nImportação concluída!');
}

seedVotingLocations().catch(console.error);
