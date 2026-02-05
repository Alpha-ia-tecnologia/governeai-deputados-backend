import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Logger, Query } from '@nestjs/common';
import { VotersService } from './voters.service';
import { Voter } from './voter.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';

@Controller('voters')
export class VotersController {
  private readonly logger = new Logger(VotersController.name);

  constructor(private readonly votersService: VotersService) {}

  // Endpoint de teste sem autenticação
  @Get('test')
  async test() {
    this.logger.log('Test endpoint called');
    return {
      message: 'Voters endpoint is working',
      timestamp: new Date().toISOString()
    };
  }

  // ============================================
  // ENDPOINTS PARA MAPA DE CALOR
  // IMPORTANTE: Devem vir ANTES de @Get(':id') para evitar conflito de rotas
  // ============================================

  @Get('heatmap/data')
  @UseGuards(JwtAuthGuard)
  async getHeatmapData(@CurrentUser() user: CurrentUserData) {
    this.logger.log('Fetching heatmap data...');
    return this.votersService.getHeatmapData(user.vereadorId);
  }

  @Get('heatmap/stats-by-neighborhood')
  @UseGuards(JwtAuthGuard)
  async getStatsByNeighborhood(@CurrentUser() user: CurrentUserData) {
    this.logger.log('Fetching stats by neighborhood...');
    return this.votersService.getStatsByNeighborhood(user.vereadorId);
  }

  @Post('heatmap/geocode-pending')
  @UseGuards(JwtAuthGuard)
  async geocodePendingVoters(
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limit?: string,
  ) {
    this.logger.log('Geocoding pending voters...');
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.votersService.geocodePendingVoters(user.vereadorId, limitNum);
  }

  // ============================================
  // ENDPOINTS CRUD
  // ============================================

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() voterData: Partial<Voter>, @CurrentUser() user: CurrentUserData) {
    this.logger.log('Creating new voter:', voterData);
    const result = await this.votersService.create(voterData, user);
    this.logger.log('Voter created successfully:', result.id);
    return result;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentUser() user: CurrentUserData) {
    this.logger.log('Fetching all voters...');
    try {
      const voters = await this.votersService.findAll(user.vereadorId);
      this.logger.log(`Found ${voters.length} voters`);
      return voters;
    } catch (error) {
      this.logger.error('Error fetching voters:', error);
      throw error;
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.votersService.findOne(id, user.vereadorId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() voterData: Partial<Voter>, @CurrentUser() user: CurrentUserData) {
    return this.votersService.update(id, voterData, user.vereadorId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.votersService.remove(id, user.vereadorId);
  }
}