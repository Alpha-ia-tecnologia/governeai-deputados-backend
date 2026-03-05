import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    WhatsappContact,
    WhatsappConversation,
    ConversationStatus,
    WhatsappMessage,
    MessageDirection,
    MessageType,
    DeliveryStatus,
} from '../entities';
import { WhatsappApiService } from './whatsapp-api.service';
import { WhatsappMediaService } from './whatsapp-media.service';
import { WhatsappGateway } from '../whatsapp.gateway';

/**
 * Serviço principal que orquestra recepção de webhooks, persistência de mensagens
 * e disparo de mensagens (RF01–RF05, RF18, RF21–RF23).
 */
@Injectable()
export class WhatsappCoreService {
    private readonly logger = new Logger(WhatsappCoreService.name);

    constructor(
        @InjectRepository(WhatsappContact)
        private readonly contactRepo: Repository<WhatsappContact>,
        @InjectRepository(WhatsappConversation)
        private readonly conversationRepo: Repository<WhatsappConversation>,
        @InjectRepository(WhatsappMessage)
        private readonly messageRepo: Repository<WhatsappMessage>,
        private readonly apiService: WhatsappApiService,
        private readonly mediaService: WhatsappMediaService,
        private readonly gateway: WhatsappGateway,
    ) { }

    // ─── RF02: Processar Webhook de Mensagens ───
    async handleIncomingMessage(webhookPayload: any): Promise<void> {
        const entries = webhookPayload?.entry || [];

        for (const entry of entries) {
            const changes = entry?.changes || [];
            for (const change of changes) {
                const value = change?.value;
                if (!value) continue;

                // Processar mensagens
                if (value.messages && value.messages.length > 0) {
                    await this.processMessages(value);
                }

                // RF05: Processar atualizações de status
                if (value.statuses && value.statuses.length > 0) {
                    await this.processStatuses(value.statuses);
                }
            }
        }
    }

    private async processMessages(value: any): Promise<void> {
        const contacts = value.contacts || [];
        const messages = value.messages || [];
        const metadata = value.metadata;

        for (const msg of messages) {
            try {
                const waId = msg.from;
                const profileName = contacts.find((c: any) => c.wa_id === waId)?.profile?.name || '';

                // RF18: Criação automática de contato
                const contact = await this.findOrCreateContact(waId, profileName);

                // Encontrar ou criar conversa
                const conversation = await this.findOrCreateConversation(contact);

                // Atualizar lastClientMessageAt (RF07 - janela 24h)
                conversation.lastClientMessageAt = new Date();
                if (conversation.status === ConversationStatus.RESOLVED) {
                    conversation.status = ConversationStatus.PENDING;
                }
                await this.conversationRepo.save(conversation);

                // Persistir mensagem
                const whatsappMessage = await this.persistInboundMessage(msg, conversation.id);

                // RF04: Tratar mídia se presente
                if (this.isMediaMessage(msg.type)) {
                    await this.handleMediaMessage(msg, whatsappMessage);
                }

                // Marcar como lida na Meta
                await this.apiService.markAsRead(msg.id);

                // RF06: Emitir em tempo real via WebSocket
                this.gateway.emitNewMessage(conversation.vereadorId, conversation.id, whatsappMessage);

                this.logger.log(`📩 Mensagem recebida de ${waId} (${msg.type}): ${msg.text?.body || '[mídia]'}`);
            } catch (error) {
                this.logger.error(`❌ Erro ao processar mensagem:`, error.message);
            }
        }
    }

    // ─── RF05: Processar Webhooks de Status ───
    private async processStatuses(statuses: any[]): Promise<void> {
        for (const statusUpdate of statuses) {
            try {
                const wamid = statusUpdate.id;
                const status = statusUpdate.status;

                const statusMap: Record<string, DeliveryStatus> = {
                    'sent': DeliveryStatus.SENT,
                    'delivered': DeliveryStatus.DELIVERED,
                    'read': DeliveryStatus.READ,
                    'failed': DeliveryStatus.FAILED,
                };

                const deliveryStatus = statusMap[status];
                if (!deliveryStatus) continue;

                const message = await this.messageRepo.findOne({ where: { wamid } });
                if (message) {
                    message.deliveryStatus = deliveryStatus;
                    await this.messageRepo.save(message);

                    // RF08: Emitir atualização de status via WebSocket
                    const conv = await this.conversationRepo.findOne({ where: { id: message.conversationId } });
                    if (conv) {
                        this.gateway.emitStatusUpdate(conv.vereadorId, wamid, status);
                    }

                    this.logger.log(`📊 Status atualizado: ${wamid} → ${status}`);
                }
            } catch (error) {
                this.logger.error(`❌ Erro ao processar status:`, error.message);
            }
        }
    }

    // ─── RF18: Criação Automática de Contatos ───
    async findOrCreateContact(phone: string, profileName: string): Promise<WhatsappContact> {
        let contact = await this.contactRepo.findOne({ where: { phone } });

        if (!contact) {
            contact = this.contactRepo.create({
                phone,
                name: profileName,
                profileName,
                // TODO: Associar ao vereador correto via configuração
                vereadorId: await this.getDefaultVereadorId(),
            });
            contact = await this.contactRepo.save(contact);
            this.logger.log(`👤 Novo contato criado: ${phone} (${profileName})`);
        } else if (profileName && contact.profileName !== profileName) {
            contact.profileName = profileName;
            contact = await this.contactRepo.save(contact);
        }

        return contact;
    }

    private async findOrCreateConversation(contact: WhatsappContact): Promise<WhatsappConversation> {
        // Buscar conversa ativa ou pendente existente
        let conversation = await this.conversationRepo.findOne({
            where: [
                { contactId: contact.id, status: ConversationStatus.ACTIVE },
                { contactId: contact.id, status: ConversationStatus.PENDING },
            ],
        });

        if (!conversation) {
            conversation = this.conversationRepo.create({
                contactId: contact.id,
                vereadorId: contact.vereadorId,
                status: ConversationStatus.PENDING,
                isBotActive: true,
            });
            conversation = await this.conversationRepo.save(conversation);
            this.logger.log(`💬 Nova conversa criada para contato ${contact.phone}`);
        }

        return conversation;
    }

    private async persistInboundMessage(msg: any, conversationId: string): Promise<WhatsappMessage> {
        const typeMap: Record<string, MessageType> = {
            'text': MessageType.TEXT,
            'image': MessageType.IMAGE,
            'audio': MessageType.AUDIO,
            'video': MessageType.VIDEO,
            'document': MessageType.DOCUMENT,
            'location': MessageType.LOCATION,
            'contacts': MessageType.CONTACT,
            'interactive': MessageType.INTERACTIVE,
            'sticker': MessageType.STICKER,
            'reaction': MessageType.REACTION,
        };

        const message = this.messageRepo.create({
            conversationId,
            wamid: msg.id,
            direction: MessageDirection.INBOUND,
            type: typeMap[msg.type] || MessageType.TEXT,
            content: msg.text?.body || msg.interactive?.list_reply?.title || msg.interactive?.button_reply?.title || null,
            deliveryStatus: DeliveryStatus.READ,
            rawPayload: msg,
        });

        // Preencher campos de localização se aplicável
        if (msg.type === 'location' && msg.location) {
            message.latitude = msg.location.latitude;
            message.longitude = msg.location.longitude;
            message.locationName = msg.location.name;
            message.locationAddress = msg.location.address;
        }

        return this.messageRepo.save(message);
    }

    // ─── RF04: Tratar Mídia Recebida ───
    private async handleMediaMessage(msg: any, whatsappMessage: WhatsappMessage): Promise<void> {
        const mediaObj = msg[msg.type]; // msg.image, msg.audio, etc.
        if (!mediaObj?.id) return;

        try {
            const { localPath, mimeType } = await this.mediaService.downloadAndStore(mediaObj.id);

            whatsappMessage.mediaId = mediaObj.id;
            whatsappMessage.mediaMimeType = mimeType;
            whatsappMessage.mediaLocalPath = localPath;
            whatsappMessage.mediaCaption = mediaObj.caption || null;

            await this.messageRepo.save(whatsappMessage);
            this.logger.log(`📎 Mídia salva: ${localPath}`);
        } catch (error) {
            this.logger.error(`❌ Erro ao processar mídia:`, error.message);
        }
    }

    // ─── RF03: Enviar Mensagem de Texto ───
    async sendMessage(
        conversationId: string,
        content: string,
        senderUserId: string,
    ): Promise<WhatsappMessage> {
        const conversation = await this.conversationRepo.findOne({
            where: { id: conversationId },
            relations: ['contact'],
        });
        if (!conversation) throw new Error('Conversa não encontrada');

        // Verificar janela de 24h (RF07)
        const is24hWindowOpen = this.check24hWindow(conversation);

        if (!is24hWindowOpen) {
            throw new Error('Janela de 24 horas expirada. Use um Template aprovado.');
        }

        // Enviar via Graph API
        const { messageId } = await this.apiService.sendTextMessage(
            conversation.contact.phone,
            content,
        );

        // Persistir mensagem enviada
        const message = this.messageRepo.create({
            conversationId,
            wamid: messageId,
            direction: MessageDirection.OUTBOUND,
            type: MessageType.TEXT,
            content,
            deliveryStatus: DeliveryStatus.SENT,
            senderUserId,
        });

        return this.messageRepo.save(message);
    }

    // ─── RF07: Verificar Janela de 24 Horas ───
    check24hWindow(conversation: WhatsappConversation): boolean {
        if (!conversation.lastClientMessageAt) return false;
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return conversation.lastClientMessageAt > twentyFourHoursAgo;
    }

    // ─── Helpers ───
    private isMediaMessage(type: string): boolean {
        return ['image', 'audio', 'video', 'document', 'sticker'].includes(type);
    }

    private async getDefaultVereadorId(): Promise<string> {
        // TODO: Implementar lógica multi-tenant adequada
        // Por ora, retorna o primeiro vereador encontrado
        const { User } = await import('../../users/user.entity');
        return '';
    }

    // ─── RF10: Buscar histórico de conversas ───
    async getConversationMessages(
        conversationId: string,
        limit = 50,
        offset = 0,
    ): Promise<WhatsappMessage[]> {
        return this.messageRepo.find({
            where: { conversationId },
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
            relations: ['senderUser'],
        });
    }

    // ─── RF10: Buscar conversas por contato (telefone) ───
    async getConversationsByPhone(phone: string): Promise<WhatsappConversation[]> {
        const contact = await this.contactRepo.findOne({ where: { phone } });
        if (!contact) return [];

        return this.conversationRepo.find({
            where: { contactId: contact.id },
            order: { updatedAt: 'DESC' },
            relations: ['contact', 'assignedTo'],
        });
    }

    // ─── Buscar conversa por ID ───
    async getConversationById(conversationId: string): Promise<WhatsappConversation | null> {
        return this.conversationRepo.findOne({
            where: { id: conversationId },
            relations: ['contact', 'assignedTo'],
        });
    }

    // ─── RF10: Listar conversas do vereador ───
    async getConversationsByVereador(vereadorId: string): Promise<WhatsappConversation[]> {
        return this.conversationRepo.find({
            where: { vereadorId },
            order: { updatedAt: 'DESC' },
            relations: ['contact', 'assignedTo'],
        });
    }

    // ─── RF11: Conversas pendentes (fila) ───
    async getPendingConversations(vereadorId: string): Promise<WhatsappConversation[]> {
        return this.conversationRepo.find({
            where: { vereadorId, status: ConversationStatus.PENDING },
            order: { createdAt: 'ASC' },
            relations: ['contact'],
        });
    }

    // ─── RF12: Atribuir conversa a atendente ───
    async assignConversation(conversationId: string, assignedToId: string): Promise<WhatsappConversation> {
        const conversation = await this.conversationRepo.findOne({ where: { id: conversationId } });
        if (!conversation) throw new Error('Conversa não encontrada');

        conversation.assignedToId = assignedToId;
        conversation.status = ConversationStatus.ACTIVE;

        const saved = await this.conversationRepo.save(conversation);
        this.gateway.emitConversationUpdate(conversation.vereadorId, conversationId, { action: 'assigned', assignedToId });
        this.logger.log(`👤 Conversa ${conversationId} atribuída a ${assignedToId}`);
        return saved;
    }

    // ─── RF13: Transferir conversa ───
    async transferConversation(
        conversationId: string,
        targetUserId: string,
        fromUserId: string,
        internalNote?: string,
    ): Promise<WhatsappConversation> {
        const conversation = await this.conversationRepo.findOne({ where: { id: conversationId } });
        if (!conversation) throw new Error('Conversa não encontrada');

        // Salvar nota interna se fornecida
        if (internalNote) {
            const { WhatsappInternalNote } = await import('../entities');
            const noteRepo = this.conversationRepo.manager.getRepository(WhatsappInternalNote);
            const note = noteRepo.create({
                conversationId,
                authorId: fromUserId,
                content: internalNote,
            });
            await noteRepo.save(note);
        }

        conversation.assignedToId = targetUserId;

        const saved = await this.conversationRepo.save(conversation);
        this.gateway.emitConversationUpdate(conversation.vereadorId, conversationId, { action: 'transferred', fromUserId, targetUserId });
        this.gateway.emitToUser(targetUserId, 'whatsapp:transferReceived', { conversationId });
        this.logger.log(`🔄 Conversa ${conversationId} transferida de ${fromUserId} para ${targetUserId}`);
        return saved;
    }

    // ─── RF14: Resolver/fechar conversa ───
    async resolveConversation(conversationId: string, resolvedById: string): Promise<WhatsappConversation> {
        const conversation = await this.conversationRepo.findOne({ where: { id: conversationId } });
        if (!conversation) throw new Error('Conversa não encontrada');

        conversation.status = ConversationStatus.RESOLVED;
        conversation.resolvedAt = new Date();
        conversation.resolvedById = resolvedById;

        const saved = await this.conversationRepo.save(conversation);
        this.gateway.emitConversationUpdate(conversation.vereadorId, conversationId, { action: 'resolved', resolvedById });
        this.logger.log(`✅ Conversa ${conversationId} resolvida por ${resolvedById}`);
        return saved;
    }
}
