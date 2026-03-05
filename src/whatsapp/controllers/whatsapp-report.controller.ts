import {
    Controller,
    Get,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { WhatsappReportService } from '../services/whatsapp-report.service';

/**
 * RF26-RF27: Controller de Relatórios WhatsApp.
 */
@Controller('whatsapp/reports')
@UseGuards(JwtAuthGuard)
export class WhatsappReportController {

    constructor(private readonly reportService: WhatsappReportService) { }

    // ─── RF26: Dashboard de métricas ───
    @Get('dashboard')
    async getDashboard(
        @Request() req: any,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        const vereadorId = req.user.vereadorId || req.user.id;
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const end = endDate || new Date().toISOString();
        return this.reportService.getDashboard(vereadorId, { startDate: start, endDate: end });
    }

    // ─── RF27: Exportar relatório completo ───
    @Get('export')
    async exportReport(
        @Request() req: any,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        const vereadorId = req.user.vereadorId || req.user.id;
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const end = endDate || new Date().toISOString();
        return this.reportService.exportReport(vereadorId, { startDate: start, endDate: end });
    }

    // ─── RF27: Exportar conversas detalhadas ───
    @Get('conversations')
    async getConversationsReport(
        @Request() req: any,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        const vereadorId = req.user.vereadorId || req.user.id;
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const end = endDate || new Date().toISOString();
        return this.reportService.getConversationsReport(vereadorId, { startDate: start, endDate: end });
    }
}
