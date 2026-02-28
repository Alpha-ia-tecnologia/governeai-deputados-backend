import { Controller, Get, Post, Query, Body, UseGuards, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ElectionResultsService } from './election-results.service';
import { DeepseekAiService } from './deepseek-ai.service';

@Controller('election-results')
@UseGuards(AuthGuard('jwt'))
export class ElectionResultsController {
    private readonly logger = new Logger(ElectionResultsController.name);

    constructor(
        private readonly electionResultsService: ElectionResultsService,
        private readonly deepseekAiService: DeepseekAiService,
    ) { }

    @Get('summary')
    async getSummary(@Query('year') year?: string) {
        return this.electionResultsService.getSummary(year ? parseInt(year) : undefined);
    }

    @Get('zones')
    async getZones(@Query('year') year?: string) {
        return this.electionResultsService.getZones(year ? parseInt(year) : undefined);
    }

    @Get('positions')
    async getPositions(@Query('year') year?: string) {
        return this.electionResultsService.getPositions(year ? parseInt(year) : undefined);
    }

    @Get('by-zone')
    async getByZone(
        @Query('position') position?: string,
        @Query('year') year?: string,
    ) {
        return this.electionResultsService.getByZone(position, year ? parseInt(year) : undefined);
    }

    @Get('by-section')
    async getBySection(
        @Query('zone') zone?: string,
        @Query('position') position?: string,
        @Query('year') year?: string,
    ) {
        return this.electionResultsService.getBySection(
            zone ? parseInt(zone) : undefined,
            position,
            year ? parseInt(year) : undefined,
        );
    }

    @Get('candidates')
    async getCandidates(
        @Query('position') position?: string,
        @Query('year') year?: string,
    ) {
        return this.electionResultsService.getCandidates(position, year ? parseInt(year) : undefined);
    }

    @Get('ranking')
    async getRanking(
        @Query('position') position?: string,
        @Query('limit') limit?: string,
        @Query('year') year?: string,
    ) {
        return this.electionResultsService.getRanking(
            position,
            limit ? parseInt(limit) : 20,
            year ? parseInt(year) : undefined,
        );
    }

    @Get('candidate-by-zone')
    async getCandidateByZone(
        @Query('candidateNumber') candidateNumber: string,
        @Query('year') year?: string,
    ) {
        return this.electionResultsService.getCandidateByZone(candidateNumber, year ? parseInt(year) : undefined);
    }

    @Get('candidate-by-section')
    async getCandidateBySection(
        @Query('candidateNumber') candidateNumber: string,
        @Query('zone') zone?: string,
        @Query('year') year?: string,
    ) {
        return this.electionResultsService.getCandidateBySection(
            candidateNumber,
            zone ? parseInt(zone) : undefined,
            year ? parseInt(year) : undefined,
        );
    }

    @Post('import')
    async importData(@Body() body: { filePath: string }) {
        this.logger.log(`Iniciando importação do arquivo: ${body.filePath}`);
        return this.electionResultsService.importFromCSV(body.filePath);
    }

    @Get('by-party')
    async getByParty(
        @Query('position') position?: string,
        @Query('year') year?: string,
    ) {
        return this.electionResultsService.getByParty(position, year ? parseInt(year) : undefined);
    }

    @Get('insights')
    async getInsights(
        @Query('position') position?: string,
        @Query('year') year?: string,
    ) {
        return this.electionResultsService.getInsights(position, year ? parseInt(year) : undefined);
    }

    @Get('section-details')
    async getSectionDetails(
        @Query('zone') zone?: string,
        @Query('position') position?: string,
        @Query('year') year?: string,
    ) {
        return this.electionResultsService.getSectionDetails(
            zone ? parseInt(zone) : undefined,
            position,
            year ? parseInt(year) : undefined,
        );
    }

    @Get('comparison')
    async getCandidateComparison(
        @Query('candidate1') candidate1: string,
        @Query('candidate2') candidate2: string,
        @Query('year') year?: string,
    ) {
        return this.electionResultsService.getCandidateComparison(candidate1, candidate2, year ? parseInt(year) : undefined);
    }

    @Get('top-candidates')
    async getTopCandidates(
        @Query('limit') limit?: string,
        @Query('position') position?: string,
        @Query('year') year?: string,
    ) {
        return this.electionResultsService.getTopCandidates(
            limit ? parseInt(limit) : 10,
            position,
            year ? parseInt(year) : undefined,
        );
    }

    // ========== ENDPOINTS POR BAIRRO ==========

    @Get('neighborhoods')
    async getNeighborhoods() {
        return this.electionResultsService.getNeighborhoods();
    }

    @Get('by-neighborhood')
    async getByNeighborhood(@Query('position') position?: string) {
        return this.electionResultsService.getByNeighborhood(position);
    }

    @Get('neighborhood-details')
    async getNeighborhoodDetails(
        @Query('neighborhood') neighborhood: string,
        @Query('position') position?: string,
    ) {
        return this.electionResultsService.getNeighborhoodDetails(neighborhood, position);
    }

    @Get('neighborhood-ranking')
    async getNeighborhoodRanking(
        @Query('neighborhood') neighborhood: string,
        @Query('position') position?: string,
        @Query('limit') limit?: string,
    ) {
        return this.electionResultsService.getRankingByNeighborhood(
            neighborhood,
            position,
            limit ? parseInt(limit) : 10,
        );
    }

    @Post('import-voting-locations')
    async importVotingLocations(@Body() body: { data: any[] }) {
        const count = await this.electionResultsService.importVotingLocations(body.data);
        return { message: `${count} locais de votação importados`, count };
    }

    @Post('clear')
    async clearAll() {
        await this.electionResultsService.clearAll();
        return { message: 'Todos os dados foram removidos' };
    }

    @Post('seed-deputado')
    async seedDeputadoData() {
        this.logger.log('Iniciando seed de dados de Deputado Estadual via API...');
        const result = await this.electionResultsService.seedDeputadoData();
        return {
            message: `Seed concluído: ${result.inserted} registros inseridos para ${result.candidates} candidatos`,
            ...result,
        };
    }

    // ========== ENDPOINTS DE IA - DEEPSEEK ==========

    @Post('ai/analyze')
    async aiAnalyze(@Body() body: {
        candidateName: string;
        party: string;
        totalVotes: number;
        year: number;
        competitors: { candidateName: string; party: string; totalVotes: number }[];
    }) {
        this.logger.log(`IA: Analisando eleição de ${body.candidateName} em ${body.year}`);
        return this.deepseekAiService.analyzeElection({
            candidate: { ...body, year: body.year },
            competitors: body.competitors.map(c => ({ ...c, year: body.year })),
            year: body.year,
            state: 'MA',
        });
    }

    @Post('ai/compare')
    async aiCompare(@Body() body: {
        candidateName: string;
        election2018: { party: string; votes: number; result: string; municipalities: number };
        election2022: { party: string; votes: number; result: string; municipalities: number };
    }) {
        this.logger.log(`IA: Comparando eleições de ${body.candidateName}`);
        return this.deepseekAiService.compareElections({
            candidate: body.candidateName,
            election2018: body.election2018,
            election2022: body.election2022,
        });
    }

    @Post('ai/simulate')
    async aiSimulate(@Body() body: {
        candidate: string;
        party: string;
        currentVotes: number;
        scenario: string;
        scenarioDetails: string;
        topCities: { name: string; votes: number }[];
    }) {
        this.logger.log(`IA: Simulando cenário "${body.scenario}" para ${body.candidate}`);
        return this.deepseekAiService.simulateScenario(body);
    }

    @Post('ai/chat')
    async aiChat(@Body() body: {
        message: string;
        context: {
            candidateName: string;
            party: string;
            state: string;
            electionHistory: { year: number; votes: number; result: string }[];
        };
    }) {
        this.logger.log(`IA: Chat - "${body.message.substring(0, 50)}..."`);
        return { response: await this.deepseekAiService.chat(body.message, body.context) };
    }
}
