import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    Param,
    Res,
    HttpStatus,
    Logger,
    UseGuards,
    Request,
    BadRequestException,
    Patch,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { WhatsappCoreService } from './services/whatsapp-core.service';
import { EvolutionApiService } from './services/evolution-api.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Controller principal do módulo WhatsApp.
 * - Rotas públicas: /whatsapp/webhook (GET/POST) — acessadas pela Meta
 * - Rotas protegidas: /whatsapp/* — acessadas pelo frontend
 */
@Controller('whatsapp')
export class WhatsappController {
    private readonly logger = new Logger(WhatsappController.name);
    private readonly verifyToken: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly coreService: WhatsappCoreService,
        private readonly evolutionService: EvolutionApiService,
    ) {
        this.verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN', '');
    }

    // ═══════════════════════════════════════════════════
    // RF01: Validação de Webhook (GET)
    // Responde ao desafio de verificação da Meta
    // ═══════════════════════════════════════════════════
    @Get('webhook')
    verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
        @Res() res: Response,
    ): void {
        this.logger.log(`🔑 Webhook verification request: mode=${mode}`);

        if (mode === 'subscribe' && token === this.verifyToken) {
            this.logger.log('✅ Webhook verificado com sucesso');
            res.status(HttpStatus.OK).send(challenge);
        } else {
            this.logger.warn('❌ Verificação de webhook falhou: token inválido');
            res.status(HttpStatus.FORBIDDEN).send('Forbidden');
        }
    }

    // ═══════════════════════════════════════════════════
    // RF02 + RF05: Recepção de Webhooks (POST)
    // Recebe mensagens e atualizações de status
    // ═══════════════════════════════════════════════════
    @Post('webhook')
    async receiveWebhook(@Body() body: any, @Res() res: Response): Promise<void> {
        // Responder imediatamente com 200 (requisito da Meta)
        res.status(HttpStatus.OK).send('EVENT_RECEIVED');

        // Processar de forma assíncrona
        try {
            if (body?.object === 'whatsapp_business_account') {
                await this.coreService.handleIncomingMessage(body);
            }
        } catch (error) {
            // Erros aqui não devem impactar a resposta ao webhook
            this.logger.error('❌ Erro ao processar webhook:', error.message);
        }
    }

    // ═══════════════════════════════════════════════════
    // Rotas Protegidas (Frontend)
    // ═══════════════════════════════════════════════════

    // RF10: Listar conversas do vereador (DB + Evolution API)
    @UseGuards(JwtAuthGuard)
    @Get('conversations')
    async getConversations(@Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        // Fetch from both sources in parallel
        const [dbConversations, evoChats] = await Promise.all([
            this.coreService.getConversationsByVereador(vereadorId).catch(() => []),
            this.evolutionService.fetchChats(vereadorId).catch(() => []),
        ]);
        // Merge: Evolution API chats + local DB conversations
        return [...evoChats, ...dbConversations];
    }

    // RF10: Buscar mensagens de uma conversa
    @UseGuards(JwtAuthGuard)
    @Get('conversations/:id/messages')
    async getMessages(
        @Param('id') conversationId: string,
        @Query('limit') limit = 50,
        @Query('offset') offset = 0,
    ) {
        return this.coreService.getConversationMessages(conversationId, +limit, +offset);
    }

    // RF03: Enviar mensagem
    @UseGuards(JwtAuthGuard)
    @Post('conversations/:id/messages')
    async sendMessage(
        @Param('id') conversationId: string,
        @Body('content') content: string,
        @Request() req: any,
    ) {
        if (!content?.trim()) throw new BadRequestException('Conteúdo da mensagem é obrigatório');
        return this.coreService.sendMessage(conversationId, content, req.user.id);
    }

    // RF07: Verificar janela de 24h
    @UseGuards(JwtAuthGuard)
    @Get('conversations/:id/window-status')
    async getWindowStatus(@Param('id') conversationId: string) {
        const conversation = await this.coreService.getConversationById(conversationId);
        if (!conversation) throw new BadRequestException('Conversa não encontrada');
        return {
            is24hWindowOpen: this.coreService.check24hWindow(conversation),
            lastClientMessageAt: conversation.lastClientMessageAt,
        };
    }

    // RF12: Atribuir conversa a atendente
    @UseGuards(JwtAuthGuard)
    @Patch('conversations/:id/assign')
    async assignConversation(
        @Param('id') conversationId: string,
        @Body('assignedToId') assignedToId: string,
    ) {
        return this.coreService.assignConversation(conversationId, assignedToId);
    }

    // RF12: Puxar conversa da fila
    @UseGuards(JwtAuthGuard)
    @Post('conversations/:id/claim')
    async claimConversation(
        @Param('id') conversationId: string,
        @Request() req: any,
    ) {
        return this.coreService.assignConversation(conversationId, req.user.id);
    }

    // RF13: Transferir conversa
    @UseGuards(JwtAuthGuard)
    @Post('conversations/:id/transfer')
    async transferConversation(
        @Param('id') conversationId: string,
        @Body() body: { targetUserId: string; internalNote?: string },
        @Request() req: any,
    ) {
        return this.coreService.transferConversation(
            conversationId,
            body.targetUserId,
            req.user.id,
            body.internalNote,
        );
    }

    // RF14: Resolver/fechar conversa
    @UseGuards(JwtAuthGuard)
    @Patch('conversations/:id/resolve')
    async resolveConversation(
        @Param('id') conversationId: string,
        @Request() req: any,
    ) {
        return this.coreService.resolveConversation(conversationId, req.user.id);
    }

    // RF11: Filas pendentes
    @UseGuards(JwtAuthGuard)
    @Get('queue')
    async getPendingQueue(@Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.coreService.getPendingConversations(vereadorId);
    }

    // ─── Evolution API: Fetch messages for a chat ───
    @UseGuards(JwtAuthGuard)
    @Get('evolution/chats/:conversationId/messages')
    async getEvolutionMessages(
        @Param('conversationId') conversationId: string,
        @Request() req: any,
    ) {
        const vereadorId = req.user.vereadorId || req.user.id;
        // conversationId format: evo_{instanceName}_{phone}
        const parts = conversationId.replace('evo_', '').split('_');
        const instanceName = parts[0];
        const phone = parts.slice(1).join('_');
        const remoteJid = `${phone}@s.whatsapp.net`;
        return this.evolutionService.fetchMessages(vereadorId, remoteJid, instanceName);
    }

    // ─── Evolution API: Send text message ───
    @UseGuards(JwtAuthGuard)
    @Post('evolution/send')
    async sendEvolutionMessage(
        @Body() body: { conversationId: string; content: string },
        @Request() req: any,
    ) {
        const vereadorId = req.user.vereadorId || req.user.id;
        // conversationId format: evo_{instanceName}_{phone}
        const parts = body.conversationId.replace('evo_', '').split('_');
        const instanceName = parts[0];
        const phone = parts.slice(1).join('_');
        const remoteJid = `${phone}@s.whatsapp.net`;
        const result = await this.evolutionService.sendTextMessage(vereadorId, instanceName, remoteJid, body.content);
        // Return in the same format as a WhatsappMessage
        return {
            id: result?.key?.id || `sent_${Date.now()}`,
            conversationId: body.conversationId,
            wamid: result?.key?.id || null,
            direction: 'outbound',
            type: 'text',
            content: body.content,
            mediaId: null,
            mediaMimeType: null,
            mediaLocalPath: null,
            mediaCaption: null,
            latitude: null,
            longitude: null,
            locationName: null,
            locationAddress: null,
            deliveryStatus: 'sent',
            senderUserId: vereadorId,
            senderUser: null,
            createdAt: new Date().toISOString(),
        };
    }
}
