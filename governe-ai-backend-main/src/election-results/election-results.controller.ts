import { Controller, Get, Post, Query, Body, UseGuards, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ElectionResultsService } from './election-results.service';

@Controller('election-results')
@UseGuards(AuthGuard('jwt'))
export class ElectionResultsController {
    private readonly logger = new Logger(ElectionResultsController.name);

    constructor(private readonly electionResultsService: ElectionResultsService) { }

    @Get('summary')
    async getSummary() {
        return this.electionResultsService.getSummary();
    }

    @Get('zones')
    async getZones() {
        return this.electionResultsService.getZones();
    }

    @Get('positions')
    async getPositions() {
        return this.electionResultsService.getPositions();
    }

    @Get('by-zone')
    async getByZone(@Query('position') position?: string) {
        return this.electionResultsService.getByZone(position);
    }

    @Get('by-section')
    async getBySection(
        @Query('zone') zone?: string,
        @Query('position') position?: string,
    ) {
        return this.electionResultsService.getBySection(
            zone ? parseInt(zone) : undefined,
            position,
        );
    }

    @Get('candidates')
    async getCandidates(@Query('position') position?: string) {
        return this.electionResultsService.getCandidates(position);
    }

    @Get('ranking')
    async getRanking(
        @Query('position') position?: string,
        @Query('limit') limit?: string,
    ) {
        return this.electionResultsService.getRanking(
            position,
            limit ? parseInt(limit) : 20,
        );
    }

    @Get('candidate-by-zone')
    async getCandidateByZone(@Query('candidateNumber') candidateNumber: string) {
        return this.electionResultsService.getCandidateByZone(candidateNumber);
    }

    @Get('candidate-by-section')
    async getCandidateBySection(
        @Query('candidateNumber') candidateNumber: string,
        @Query('zone') zone?: string,
    ) {
        return this.electionResultsService.getCandidateBySection(
            candidateNumber,
            zone ? parseInt(zone) : undefined,
        );
    }

    @Post('import')
    async importData(@Body() body: { filePath: string }) {
        this.logger.log(`Iniciando importação do arquivo: ${body.filePath}`);
        return this.electionResultsService.importFromCSV(body.filePath);
    }

    // Novos endpoints para dashboard avançado

    @Get('by-party')
    async getByParty(@Query('position') position?: string) {
        return this.electionResultsService.getByParty(position);
    }

    @Get('insights')
    async getInsights(@Query('position') position?: string) {
        return this.electionResultsService.getInsights(position);
    }

    @Get('section-details')
    async getSectionDetails(
        @Query('zone') zone?: string,
        @Query('position') position?: string,
    ) {
        return this.electionResultsService.getSectionDetails(
            zone ? parseInt(zone) : undefined,
            position,
        );
    }

    @Get('comparison')
    async getCandidateComparison(
        @Query('candidate1') candidate1: string,
        @Query('candidate2') candidate2: string,
    ) {
        return this.electionResultsService.getCandidateComparison(candidate1, candidate2);
    }

    @Get('top-candidates')
    async getTopCandidates(
        @Query('limit') limit?: string,
        @Query('position') position?: string,
    ) {
        return this.electionResultsService.getTopCandidates(
            limit ? parseInt(limit) : 10,
            position,
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
}
