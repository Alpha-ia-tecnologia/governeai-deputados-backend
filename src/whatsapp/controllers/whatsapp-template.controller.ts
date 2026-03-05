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
    Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import {
    WhatsappTemplateService,
    CreateTemplateDto,
    UpdateTemplateDto,
    SendTemplateDto,
} from '../services/whatsapp-template.service';

/**
 * Controller para gerenciamento de Templates WhatsApp (RF15-RF17).
 * Todas as rotas protegidas por JWT.
 */
@Controller('whatsapp/templates')
@UseGuards(JwtAuthGuard)
export class WhatsappTemplateController {

    constructor(private readonly templateService: WhatsappTemplateService) { }

    // ─── RF15: Listar templates ───
    @Get()
    async findAll(@Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.templateService.findAll(vereadorId);
    }

    // ─── RF17: Listar templates aprovados (para seleção no chat) ───
    @Get('approved')
    async findApproved(@Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.templateService.findApproved(vereadorId);
    }

    // ─── RF15: Buscar template por ID ───
    @Get(':id')
    async findById(@Param('id') id: string, @Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.templateService.findById(id, vereadorId);
    }

    // ─── RF16: Extrair variáveis de um template ───
    @Get(':id/variables')
    async getVariables(@Param('id') id: string, @Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        const template = await this.templateService.findById(id, vereadorId);
        return this.templateService.extractVariables(template);
    }

    // ─── RF15: Criar template ───
    @Post()
    async create(@Body() dto: CreateTemplateDto, @Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.templateService.create(dto, vereadorId);
    }

    // ─── RF15: Atualizar template ───
    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateTemplateDto,
        @Request() req: any,
    ) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.templateService.update(id, dto, vereadorId);
    }

    // ─── RF15: Deletar template ───
    @Delete(':id')
    async delete(@Param('id') id: string, @Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        await this.templateService.delete(id, vereadorId);
        return { message: 'Template removido com sucesso' };
    }

    // ─── RF15: Sincronizar status com a Meta ───
    @Post('sync')
    async sync(@Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.templateService.syncFromMeta(vereadorId);
    }

    // ─── RF17: Enviar template (iniciar conversa) ───
    @Post('send')
    async sendTemplate(@Body() dto: SendTemplateDto, @Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.templateService.sendTemplate(dto, vereadorId);
    }
}
