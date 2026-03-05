import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Request,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import {
    WhatsappBotService,
    CreateBotFlowDto,
    UpdateBotFlowDto,
} from '../services/whatsapp-bot.service';

/**
 * RF21-RF23: Controller para configuração de Bot/Automação.
 */
@Controller('whatsapp/bot')
@UseGuards(JwtAuthGuard)
export class WhatsappBotController {

    constructor(private readonly botService: WhatsappBotService) { }

    // ─── Listar todos os fluxos ───
    @Get('flows')
    async findAll(@Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.botService.findAll(vereadorId);
    }

    // ─── Templates de fluxo (pré-configurados) ───
    @Get('templates')
    async getTemplates() {
        return this.botService.getFlowTemplates();
    }

    // ─── Buscar fluxo por ID ───
    @Get('flows/:id')
    async findById(@Param('id') id: string, @Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.botService.findById(id, vereadorId);
    }

    // ─── Criar fluxo ───
    @Post('flows')
    async create(@Body() dto: CreateBotFlowDto, @Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.botService.create(dto, vereadorId);
    }

    // ─── Atualizar fluxo ───
    @Patch('flows/:id')
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateBotFlowDto,
        @Request() req: any,
    ) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.botService.update(id, dto, vereadorId);
    }

    // ─── Deletar fluxo ───
    @Delete('flows/:id')
    async delete(@Param('id') id: string, @Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        await this.botService.delete(id, vereadorId);
        return { message: 'Fluxo removido' };
    }

    // ─── Ativar/Desativar fluxo ───
    @Post('flows/:id/toggle')
    async toggleStatus(@Param('id') id: string, @Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.botService.toggleStatus(id, vereadorId);
    }
}
