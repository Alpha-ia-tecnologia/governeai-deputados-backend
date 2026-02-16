import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElectionResult } from './election-result.entity';
import { VotingLocation } from './voting-location.entity';
import * as fs from 'fs';
import * as readline from 'readline';

@Injectable()
export class ElectionResultsService {
    private readonly logger = new Logger(ElectionResultsService.name);
    private readonly defaultMunicipality = 'PARNAÍBA';

    constructor(
        @InjectRepository(ElectionResult)
        private readonly electionResultRepository: Repository<ElectionResult>,
        @InjectRepository(VotingLocation)
        private readonly votingLocationRepository: Repository<VotingLocation>,
    ) { }

    // Importar dados de um CSV do TSE
    async importFromCSV(filePath: string, municipalityCode: string = '11029'): Promise<{ imported: number; skipped: number }> {
        const fileStream = fs.createReadStream(filePath, { encoding: 'latin1' });
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        let imported = 0;
        let skipped = 0;
        let isFirstLine = true;
        let headers: string[] = [];
        const batch: Partial<ElectionResult>[] = [];

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

            const result: Partial<ElectionResult> = {
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

            batch.push(result);

            // Salvar em lotes de 1000
            if (batch.length >= 1000) {
                await this.electionResultRepository.save(batch);
                imported += batch.length;
                batch.length = 0;
                this.logger.log(`Importados ${imported} registros...`);
            }
        }

        // Salvar registros restantes
        if (batch.length > 0) {
            await this.electionResultRepository.save(batch);
            imported += batch.length;
        }

        this.logger.log(`Importação concluída: ${imported} registros importados, ${skipped} ignorados`);
        return { imported, skipped };
    }

    // Resumo geral
    async getSummary(): Promise<any> {
        const totalVotes = await this.electionResultRepository
            .createQueryBuilder('er')
            .select('SUM(er.votes)', 'total')
            .where('er.municipality = :mun', { mun: this.defaultMunicipality })
            .getRawOne();

        const byPosition = await this.electionResultRepository
            .createQueryBuilder('er')
            .select('er.position', 'position')
            .addSelect('SUM(er.votes)', 'total')
            .where('er.municipality = :mun', { mun: this.defaultMunicipality })
            .groupBy('er.position')
            .getRawMany();

        const zonesCount = await this.electionResultRepository
            .createQueryBuilder('er')
            .select('COUNT(DISTINCT er.zone)', 'count')
            .where('er.municipality = :mun', { mun: this.defaultMunicipality })
            .getRawOne();

        const sectionsCount = await this.electionResultRepository
            .createQueryBuilder('er')
            .select('COUNT(DISTINCT er.section)', 'count')
            .where('er.municipality = :mun', { mun: this.defaultMunicipality })
            .getRawOne();

        return {
            totalVotes: parseInt(totalVotes?.total) || 0,
            byPosition,
            zonesCount: parseInt(zonesCount?.count) || 0,
            sectionsCount: parseInt(sectionsCount?.count) || 0,
        };
    }

    // Votos agregados por zona
    async getByZone(position?: string): Promise<any[]> {
        const query = this.electionResultRepository
            .createQueryBuilder('er')
            .select('er.zone', 'zone')
            .addSelect('SUM(er.votes)', 'totalVotes')
            .addSelect('COUNT(DISTINCT er.section)', 'sectionsCount')
            .where('er.municipality = :mun', { mun: this.defaultMunicipality })
            .groupBy('er.zone')
            .orderBy('er.zone', 'ASC');

        if (position) {
            query.andWhere('er.position = :position', { position });
        }

        return query.getRawMany();
    }

    // Votos agregados por seção
    async getBySection(zone?: number, position?: string): Promise<any[]> {
        const query = this.electionResultRepository
            .createQueryBuilder('er')
            .select('er.zone', 'zone')
            .addSelect('er.section', 'section')
            .addSelect('SUM(er.votes)', 'totalVotes')
            .where('er.municipality = :mun', { mun: this.defaultMunicipality })
            .groupBy('er.zone')
            .addGroupBy('er.section')
            .orderBy('er.zone', 'ASC')
            .addOrderBy('er.section', 'ASC');

        if (zone) {
            query.andWhere('er.zone = :zone', { zone });
        }
        if (position) {
            query.andWhere('er.position = :position', { position });
        }

        return query.getRawMany();
    }

    // Lista de candidatos
    async getCandidates(position?: string): Promise<any[]> {
        const query = this.electionResultRepository
            .createQueryBuilder('er')
            .select('er.candidateNumber', 'number')
            .addSelect('er.candidateName', 'name')
            .addSelect('er.partyAcronym', 'party')
            .addSelect('er.position', 'position')
            .addSelect('SUM(er.votes)', 'totalVotes')
            .where('er.municipality = :mun', { mun: this.defaultMunicipality })
            .groupBy('er.candidateNumber')
            .addGroupBy('er.candidateName')
            .addGroupBy('er.partyAcronym')
            .addGroupBy('er.position')
            .orderBy('SUM(er.votes)', 'DESC');

        if (position) {
            query.andWhere('er.position = :position', { position });
        }

        return query.getRawMany();
    }

    // Ranking de candidatos
    async getRanking(position?: string, limit: number = 20): Promise<any[]> {
        const candidates = await this.getCandidates(position);
        return candidates.slice(0, limit).map((c, index) => ({
            rank: index + 1,
            ...c,
            totalVotes: parseInt(c.totalVotes) || 0,
        }));
    }

    // Votos de um candidato específico por zona
    async getCandidateByZone(candidateNumber: string): Promise<any[]> {
        return this.electionResultRepository
            .createQueryBuilder('er')
            .select('er.zone', 'zone')
            .addSelect('SUM(er.votes)', 'votes')
            .where('er.municipality = :mun', { mun: this.defaultMunicipality })
            .andWhere('er.candidateNumber = :candidateNumber', { candidateNumber })
            .groupBy('er.zone')
            .orderBy('er.zone', 'ASC')
            .getRawMany();
    }

    // Votos de um candidato específico por seção
    async getCandidateBySection(candidateNumber: string, zone?: number): Promise<any[]> {
        const query = this.electionResultRepository
            .createQueryBuilder('er')
            .select('er.zone', 'zone')
            .addSelect('er.section', 'section')
            .addSelect('er.votes', 'votes')
            .where('er.municipality = :mun', { mun: this.defaultMunicipality })
            .andWhere('er.candidateNumber = :candidateNumber', { candidateNumber })
            .orderBy('er.zone', 'ASC')
            .addOrderBy('er.section', 'ASC');

        if (zone) {
            query.andWhere('er.zone = :zone', { zone });
        }

        return query.getRawMany();
    }

    // Lista de zonas disponíveis
    async getZones(): Promise<number[]> {
        const result = await this.electionResultRepository
            .createQueryBuilder('er')
            .select('DISTINCT er.zone', 'zone')
            .where('er.municipality = :mun', { mun: this.defaultMunicipality })
            .orderBy('er.zone', 'ASC')
            .getRawMany();

        return result.map(r => r.zone);
    }

    // Lista de cargos disponíveis
    async getPositions(): Promise<string[]> {
        const result = await this.electionResultRepository
            .createQueryBuilder('er')
            .select('DISTINCT er.position', 'position')
            .where('er.municipality = :mun', { mun: this.defaultMunicipality })
            .getRawMany();

        return result.map(r => r.position);
    }

    // Votos agregados por partido
    async getByParty(position?: string): Promise<any[]> {
        const query = this.electionResultRepository
            .createQueryBuilder('er')
            .select('er.partyAcronym', 'party')
            .addSelect('er.partyName', 'partyName')
            .addSelect('SUM(er.votes)', 'totalVotes')
            .addSelect('COUNT(DISTINCT er.candidateNumber)', 'candidatesCount')
            .where('er.municipality = :mun', { mun: this.defaultMunicipality })
            .andWhere('er.partyAcronym IS NOT NULL')
            .groupBy('er.partyAcronym')
            .addGroupBy('er.partyName')
            .orderBy('SUM(er.votes)', 'DESC');

        if (position) {
            query.andWhere('er.position = :position', { position });
        }

        const results = await query.getRawMany();
        const total = results.reduce((sum, r) => sum + parseInt(r.totalVotes || 0), 0);

        return results.map(r => ({
            ...r,
            totalVotes: parseInt(r.totalVotes) || 0,
            candidatesCount: parseInt(r.candidatesCount) || 0,
            percentage: total > 0 ? ((parseInt(r.totalVotes) / total) * 100).toFixed(2) : 0,
        }));
    }

    // Insights calculados automaticamente
    async getInsights(position?: string): Promise<any> {
        // Top candidato
        const ranking = await this.getRanking(position, 5);
        const topCandidate = ranking[0] || null;
        const runnerUp = ranking[1] || null;

        // Diferença entre 1º e 2º
        const voteDifference = topCandidate && runnerUp
            ? topCandidate.totalVotes - runnerUp.totalVotes
            : 0;
        const percentageDifference = runnerUp?.totalVotes > 0
            ? ((voteDifference / runnerUp.totalVotes) * 100).toFixed(1)
            : 0;

        // Seção com mais e menos votos
        const sections = await this.getBySection(undefined, position);
        const sortedSections = sections.sort((a, b) => parseInt(b.totalVotes) - parseInt(a.totalVotes));
        const topSection = sortedSections[0] || null;
        const lowSection = sortedSections[sortedSections.length - 1] || null;

        // Líder por zona
        const zones = await this.getZones();
        const leadersByZone = await Promise.all(
            zones.map(async (zone) => {
                const zoneQuery = this.electionResultRepository
                    .createQueryBuilder('er')
                    .select('er.candidateName', 'name')
                    .addSelect('er.candidateNumber', 'number')
                    .addSelect('er.partyAcronym', 'party')
                    .addSelect('SUM(er.votes)', 'votes')
                    .where('er.municipality = :mun', { mun: this.defaultMunicipality })
                    .andWhere('er.zone = :zone', { zone })
                    .groupBy('er.candidateName')
                    .addGroupBy('er.candidateNumber')
                    .addGroupBy('er.partyAcronym')
                    .orderBy('SUM(er.votes)', 'DESC')
                    .limit(1);

                if (position) {
                    zoneQuery.andWhere('er.position = :position', { position });
                }

                const leader = await zoneQuery.getRawOne();
                return { zone, leader };
            })
        );

        // Distribuição de votos (concentração)
        const totalVotes = ranking.reduce((sum, c) => sum + c.totalVotes, 0);
        const top3Votes = ranking.slice(0, 3).reduce((sum, c) => sum + c.totalVotes, 0);
        const concentrationRate = totalVotes > 0 ? ((top3Votes / totalVotes) * 100).toFixed(1) : 0;

        return {
            topCandidate,
            runnerUp,
            voteDifference,
            percentageDifference,
            topSection: topSection ? {
                zone: topSection.zone,
                section: topSection.section,
                votes: parseInt(topSection.totalVotes) || 0,
            } : null,
            lowSection: lowSection ? {
                zone: lowSection.zone,
                section: lowSection.section,
                votes: parseInt(lowSection.totalVotes) || 0,
            } : null,
            leadersByZone,
            concentrationRate,
            totalCandidates: ranking.length,
            totalSections: sections.length,
        };
    }

    // Detalhes por seção com candidato mais votado
    async getSectionDetails(zone?: number, position?: string): Promise<any[]> {
        const query = this.electionResultRepository
            .createQueryBuilder('er')
            .select('er.zone', 'zone')
            .addSelect('er.section', 'section')
            .addSelect('er.candidateName', 'topCandidateName')
            .addSelect('er.candidateNumber', 'topCandidateNumber')
            .addSelect('er.partyAcronym', 'topCandidateParty')
            .addSelect('er.votes', 'topCandidateVotes')
            .where('er.municipality = :mun', { mun: this.defaultMunicipality });

        if (zone) {
            query.andWhere('er.zone = :zone', { zone });
        }
        if (position) {
            query.andWhere('er.position = :position', { position });
        }

        const allResults = await query.getRawMany();

        // Agrupar por seção e encontrar o top candidato
        const sectionsMap = new Map<string, any>();

        for (const result of allResults) {
            const key = `${result.zone}-${result.section}`;
            const votes = parseInt(result.topCandidateVotes) || 0;

            if (!sectionsMap.has(key) || votes > (sectionsMap.get(key).topCandidateVotes || 0)) {
                sectionsMap.set(key, {
                    zone: result.zone,
                    section: result.section,
                    topCandidateName: result.topCandidateName,
                    topCandidateNumber: result.topCandidateNumber,
                    topCandidateParty: result.topCandidateParty,
                    topCandidateVotes: votes,
                });
            }
        }

        // Calcular total de votos por seção
        const sectionTotals = await this.getBySection(zone, position);
        const totalsMap = new Map(sectionTotals.map(s => [`${s.zone}-${s.section}`, parseInt(s.totalVotes) || 0]));

        return Array.from(sectionsMap.values())
            .map(s => ({
                ...s,
                totalVotes: totalsMap.get(`${s.zone}-${s.section}`) || 0,
            }))
            .sort((a, b) => a.zone - b.zone || a.section - b.section);
    }

    // Comparação entre dois candidatos
    async getCandidateComparison(candidateNumber1: string, candidateNumber2: string): Promise<any> {
        const [candidate1Zones, candidate2Zones] = await Promise.all([
            this.getCandidateByZone(candidateNumber1),
            this.getCandidateByZone(candidateNumber2),
        ]);

        const [candidate1Info, candidate2Info] = await Promise.all([
            this.electionResultRepository.findOne({
                where: { candidateNumber: candidateNumber1, municipality: this.defaultMunicipality }
            }),
            this.electionResultRepository.findOne({
                where: { candidateNumber: candidateNumber2, municipality: this.defaultMunicipality }
            }),
        ]);

        const zones = await this.getZones();

        const comparison = zones.map(zone => {
            const c1 = candidate1Zones.find(z => z.zone === zone);
            const c2 = candidate2Zones.find(z => z.zone === zone);
            const votes1 = parseInt(c1?.votes) || 0;
            const votes2 = parseInt(c2?.votes) || 0;

            return {
                zone,
                candidate1Votes: votes1,
                candidate2Votes: votes2,
                difference: votes1 - votes2,
                winner: votes1 > votes2 ? 1 : votes2 > votes1 ? 2 : 0,
            };
        });

        const total1 = comparison.reduce((sum, c) => sum + c.candidate1Votes, 0);
        const total2 = comparison.reduce((sum, c) => sum + c.candidate2Votes, 0);

        return {
            candidate1: {
                number: candidateNumber1,
                name: candidate1Info?.candidateName || 'Candidato 1',
                party: candidate1Info?.partyAcronym || '',
                totalVotes: total1,
                zonesWon: comparison.filter(c => c.winner === 1).length,
            },
            candidate2: {
                number: candidateNumber2,
                name: candidate2Info?.candidateName || 'Candidato 2',
                party: candidate2Info?.partyAcronym || '',
                totalVotes: total2,
                zonesWon: comparison.filter(c => c.winner === 2).length,
            },
            comparison,
            overallWinner: total1 > total2 ? 1 : total2 > total1 ? 2 : 0,
        };
    }

    // Top N candidatos para gráfico
    async getTopCandidates(limit: number = 10, position?: string): Promise<any[]> {
        return this.getRanking(position, limit);
    }

    // ========== ANÁLISE POR BAIRRO ==========

    // Lista de bairros disponíveis
    async getNeighborhoods(): Promise<string[]> {
        const result = await this.votingLocationRepository
            .createQueryBuilder('vl')
            .select('DISTINCT vl.neighborhood', 'neighborhood')
            .orderBy('vl.neighborhood', 'ASC')
            .getRawMany();
        return result.map(r => r.neighborhood);
    }

    // Votos agregados por bairro
    async getByNeighborhood(position?: string): Promise<any[]> {
        // Primeiro, pegar mapeamento seção -> bairro
        const locations = await this.votingLocationRepository.find();
        const sectionToNeighborhood = new Map<string, string>();
        locations.forEach(loc => {
            sectionToNeighborhood.set(`${loc.zone}-${loc.section}`, loc.neighborhood);
        });

        // Agregar votos por seção
        const query = this.electionResultRepository
            .createQueryBuilder('er')
            .select('er.zone', 'zone')
            .addSelect('er.section', 'section')
            .addSelect('SUM(er.votes)', 'votes')
            .where('er.municipality = :mun', { mun: this.defaultMunicipality })
            .groupBy('er.zone')
            .addGroupBy('er.section');

        if (position) {
            query.andWhere('er.position = :position', { position });
        }

        const sectionVotes = await query.getRawMany();

        // Agregar por bairro
        const neighborhoodVotes = new Map<string, number>();
        const neighborhoodSections = new Map<string, number>();

        sectionVotes.forEach(sv => {
            const key = `${sv.zone}-${sv.section}`;
            const neighborhood = sectionToNeighborhood.get(key) || 'NÃO MAPEADO';
            const votes = parseInt(sv.votes) || 0;
            neighborhoodVotes.set(neighborhood, (neighborhoodVotes.get(neighborhood) || 0) + votes);
            neighborhoodSections.set(neighborhood, (neighborhoodSections.get(neighborhood) || 0) + 1);
        });

        // Converter para array e ordenar
        const total = Array.from(neighborhoodVotes.values()).reduce((a, b) => a + b, 0);
        const result = Array.from(neighborhoodVotes.entries())
            .map(([neighborhood, votes]) => ({
                neighborhood,
                totalVotes: votes,
                sectionsCount: neighborhoodSections.get(neighborhood) || 0,
                percentage: total > 0 ? ((votes / total) * 100).toFixed(2) : 0,
            }))
            .sort((a, b) => b.totalVotes - a.totalVotes);

        return result;
    }

    // Ranking de candidatos por bairro
    async getRankingByNeighborhood(neighborhood: string, position?: string, limit: number = 10): Promise<any[]> {
        // Pegar seções do bairro
        const locations = await this.votingLocationRepository.find({ where: { neighborhood } });
        if (locations.length === 0) return [];

        const sections = locations.map(l => ({ zone: l.zone, section: l.section }));

        // Consultar votos para essas seções
        let query = this.electionResultRepository
            .createQueryBuilder('er')
            .select('er.candidateNumber', 'number')
            .addSelect('er.candidateName', 'name')
            .addSelect('er.partyAcronym', 'party')
            .addSelect('er.position', 'position')
            .addSelect('SUM(er.votes)', 'totalVotes')
            .where('er.municipality = :mun', { mun: this.defaultMunicipality });

        // Filtro de seções
        const sectionConditions = sections.map((s, i) => `(er.zone = :z${i} AND er.section = :s${i})`);
        const params: any = {};
        sections.forEach((s, i) => {
            params[`z${i}`] = s.zone;
            params[`s${i}`] = s.section;
        });
        query = query.andWhere(`(${sectionConditions.join(' OR ')})`, params);

        if (position) {
            query = query.andWhere('er.position = :position', { position });
        }

        query = query
            .groupBy('er.candidateNumber')
            .addGroupBy('er.candidateName')
            .addGroupBy('er.partyAcronym')
            .addGroupBy('er.position')
            .orderBy('SUM(er.votes)', 'DESC')
            .limit(limit);

        const candidates = await query.getRawMany();
        return candidates.map((c, index) => ({
            rank: index + 1,
            ...c,
            totalVotes: parseInt(c.totalVotes) || 0,
        }));
    }

    // Detalhes de um bairro específico
    async getNeighborhoodDetails(neighborhood: string, position?: string): Promise<any> {
        const locations = await this.votingLocationRepository.find({ where: { neighborhood } });
        if (locations.length === 0) return null;

        const ranking = await this.getRankingByNeighborhood(neighborhood, position, 5);
        const topCandidate = ranking[0] || null;

        // Total de votos do bairro
        const sections = locations.map(l => ({ zone: l.zone, section: l.section }));
        let totalVotes = 0;

        for (const sec of sections) {
            const query = this.electionResultRepository
                .createQueryBuilder('er')
                .select('SUM(er.votes)', 'votes')
                .where('er.municipality = :mun', { mun: this.defaultMunicipality })
                .andWhere('er.zone = :zone', { zone: sec.zone })
                .andWhere('er.section = :section', { section: sec.section });

            if (position) {
                query.andWhere('er.position = :position', { position });
            }

            const result = await query.getRawOne();
            totalVotes += parseInt(result?.votes) || 0;
        }

        return {
            neighborhood,
            sectionsCount: locations.length,
            totalVotes,
            topCandidate,
            ranking,
            votingLocations: [...new Set(locations.map(l => l.locationName))],
        };
    }

    // Importar locais de votação de JSON
    async importVotingLocations(data: any[]): Promise<number> {
        await this.votingLocationRepository.clear();
        let count = 0;
        for (const loc of data) {
            await this.votingLocationRepository.save({
                zone: loc.zone,
                section: loc.section,
                neighborhood: loc.neighborhood,
                locationName: loc.locationName,
                address: loc.address,
                municipality: 'PARNAÍBA',
                state: 'PI',
            });
            count++;
        }
        return count;
    }

    // Limpar todos os dados
    async clearAll(): Promise<void> {
        await this.electionResultRepository.clear();
    }

    // ========== SEED DE DADOS DE DEPUTADO ESTADUAL ==========
    async seedDeputadoData(): Promise<{ inserted: number; candidates: number }> {
        this.logger.log('Iniciando seed de dados de Deputado Estadual...');

        // Remover dados anteriores de Deputado Estadual
        await this.electionResultRepository
            .createQueryBuilder()
            .delete()
            .where('position = :position', { position: 'Deputado Estadual' })
            .execute();

        const deputadoData = [
            { candidateNumber: '40000', candidateName: 'ADELMO SOARES', partyNumber: '40', partyAcronym: 'PSB', partyName: 'PARTIDO SOCIALISTA BRASILEIRO', votes: 34127 },
            { candidateNumber: '40123', candidateName: 'WELLINGTON DO CURSO', partyNumber: '40', partyAcronym: 'PSB', partyName: 'PARTIDO SOCIALISTA BRASILEIRO', votes: 48932 },
            { candidateNumber: '13456', candidateName: 'YGLÉSIO MOYSES', partyNumber: '13', partyAcronym: 'PT', partyName: 'PARTIDO DOS TRABALHADORES', votes: 42815 },
            { candidateNumber: '15789', candidateName: 'FERNANDO PESSOA', partyNumber: '15', partyAcronym: 'MDB', partyName: 'MOVIMENTO DEMOCRÁTICO BRASILEIRO', votes: 39456 },
            { candidateNumber: '22111', candidateName: 'MARCOS CALDAS', partyNumber: '22', partyAcronym: 'PL', partyName: 'PARTIDO LIBERAL', votes: 36890 },
            { candidateNumber: '55222', candidateName: 'OTHELINO NETO', partyNumber: '55', partyAcronym: 'PSD', partyName: 'PARTIDO SOCIAL DEMOCRÁTICO', votes: 35214 },
            { candidateNumber: '11333', candidateName: 'CÁSSIO PALHANO', partyNumber: '11', partyAcronym: 'PP', partyName: 'PROGRESSISTAS', votes: 33876 },
            { candidateNumber: '10444', candidateName: 'DUARTE JUNIOR', partyNumber: '10', partyAcronym: 'REPUBLICANOS', partyName: 'REPUBLICANOS', votes: 31245 },
            { candidateNumber: '44555', candidateName: 'ROBERTO COSTA', partyNumber: '44', partyAcronym: 'UNIÃO', partyName: 'UNIÃO BRASIL', votes: 29876 },
            { candidateNumber: '20666', candidateName: 'LEVI PONTES', partyNumber: '20', partyAcronym: 'PODE', partyName: 'PODEMOS', votes: 27543 },
            { candidateNumber: '65777', candidateName: 'ANA REGINA SOUSA', partyNumber: '65', partyAcronym: 'PCdoB', partyName: 'PARTIDO COMUNISTA DO BRASIL', votes: 25890 },
            { candidateNumber: '12888', candidateName: 'JOSUÉ RAMOS', partyNumber: '12', partyAcronym: 'PDT', partyName: 'PARTIDO DEMOCRÁTICO TRABALHISTA', votes: 23456 },
            { candidateNumber: '43999', candidateName: 'MARCOS VINÍCIUS SILVA', partyNumber: '43', partyAcronym: 'PV', partyName: 'PARTIDO VERDE', votes: 19876 },
            { candidateNumber: '50111', candidateName: 'ILMA GUIMARÃES', partyNumber: '50', partyAcronym: 'PSOL', partyName: 'PARTIDO SOCIALISMO E LIBERDADE', votes: 16543 },
            { candidateNumber: '70222', candidateName: 'MARCOS AURÉLIO RAMOS', partyNumber: '70', partyAcronym: 'AVANTE', partyName: 'AVANTE', votes: 14321 },
            { candidateNumber: '33333', candidateName: 'PEDRO LUCAS FERNANDES', partyNumber: '33', partyAcronym: 'PMN', partyName: 'PARTIDO DA MOBILIZAÇÃO NACIONAL', votes: 11234 },
            { candidateNumber: '77444', candidateName: 'RITA BARROS', partyNumber: '77', partyAcronym: 'SOLID', partyName: 'SOLIDARIEDADE', votes: 8765 },
            { candidateNumber: '36555', candidateName: 'JORGE CARVALHO', partyNumber: '36', partyAcronym: 'AGIR', partyName: 'AGIR', votes: 6543 },
            { candidateNumber: '30666', candidateName: 'ANTÔNIO BRITO NETO', partyNumber: '30', partyAcronym: 'NOVO', partyName: 'PARTIDO NOVO', votes: 4321 },
        ];

        const electionYear = 2022;
        const round = 1;
        const municipality = this.defaultMunicipality;
        const state = 'PI';
        const zones = [3, 4]; // Mesmas zonas do município
        const sectionsPerZone = 100;

        let totalRecords = 0;
        const batch: Partial<ElectionResult>[] = [];

        for (const candidate of deputadoData) {
            let remainingVotes = candidate.votes;

            // Adelmo Soares: forte na zona 3 (55%/45%), outros: variação
            const zoneWeight = candidate.candidateNumber === '40000' ? 0.55 : (0.40 + Math.random() * 0.20);

            for (let zi = 0; zi < zones.length; zi++) {
                const zone = zones[zi];
                const zoneVotes = zi === 0
                    ? Math.floor(candidate.votes * zoneWeight)
                    : candidate.votes - Math.floor(candidate.votes * zoneWeight);

                const numSections = Math.floor(sectionsPerZone * (0.3 + Math.random() * 0.4));
                let sectionRemaining = zi === 0 ? Math.floor(candidate.votes * zoneWeight) : zoneVotes;

                for (let s = 1; s <= numSections && sectionRemaining > 0; s++) {
                    const sectionVotes = s === numSections
                        ? sectionRemaining
                        : Math.max(1, Math.floor(sectionRemaining / (numSections - s + 1) * (0.3 + Math.random() * 1.4)));

                    const actualVotes = Math.min(sectionVotes, sectionRemaining);
                    if (actualVotes <= 0) continue;

                    batch.push({
                        electionYear,
                        round,
                        zone,
                        section: s,
                        position: 'Deputado Estadual',
                        candidateNumber: candidate.candidateNumber,
                        candidateName: candidate.candidateName,
                        partyNumber: candidate.partyNumber,
                        partyAcronym: candidate.partyAcronym,
                        partyName: candidate.partyName,
                        votes: actualVotes,
                        municipality,
                        state,
                    });

                    sectionRemaining -= actualVotes;
                    totalRecords++;

                    // Salvar em lotes de 500
                    if (batch.length >= 500) {
                        await this.electionResultRepository.save(batch);
                        batch.length = 0;
                    }
                }
            }
        }

        // Salvar registros restantes
        if (batch.length > 0) {
            await this.electionResultRepository.save(batch);
        }

        this.logger.log(`Seed concluído: ${totalRecords} registros de Deputado Estadual inseridos para ${deputadoData.length} candidatos`);
        return { inserted: totalRecords, candidates: deputadoData.length };
    }
}
