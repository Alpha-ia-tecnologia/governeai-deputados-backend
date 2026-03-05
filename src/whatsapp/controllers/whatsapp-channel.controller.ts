import { Controller, Get, Post, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { EvolutionApiService } from '../services/evolution-api.service';

@Controller('whatsapp/channels')
@UseGuards(JwtAuthGuard)
export class WhatsappChannelController {
    constructor(private readonly evolutionService: EvolutionApiService) { }

    @Get()
    async listChannels(@Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.userId;
        return this.evolutionService.getChannels(vereadorId);
    }

    @Post()
    async createChannel(@Body() body: { instanceName: string }, @Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.userId;
        return this.evolutionService.createChannel(vereadorId, body.instanceName);
    }

    @Get(':id/qrcode')
    async getQrCode(@Param('id') id: string, @Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.userId;
        return this.evolutionService.getQrCode(vereadorId, id);
    }

    @Get(':id/status')
    async getStatus(@Param('id') id: string, @Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.userId;
        return this.evolutionService.getChannelStatus(vereadorId, id);
    }

    @Delete(':id')
    async deleteChannel(@Param('id') id: string, @Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.userId;
        await this.evolutionService.deleteChannel(vereadorId, id);
        return { success: true, message: 'Canal removido com sucesso' };
    }

    @Post('test-connection')
    async testConnection(@Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.userId;
        return this.evolutionService.testEvolutionConnection(vereadorId);
    }
}
