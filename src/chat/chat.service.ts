import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ChatConversation } from './chat-conversation.entity';
import { ChatParticipant, ParticipantRole } from './chat-participant.entity';
import { ChatMessage } from './chat-message.entity';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);

    constructor(
        @InjectRepository(ChatConversation)
        private conversationRepo: Repository<ChatConversation>,
        @InjectRepository(ChatParticipant)
        private participantRepo: Repository<ChatParticipant>,
        @InjectRepository(ChatMessage)
        private messageRepo: Repository<ChatMessage>,
    ) { }

    private getVereadorId(user: CurrentUserData): string {
        return user.role === UserRole.ADMIN ? (user.vereadorId || user.userId) : user.vereadorId;
    }

    // ==================== CONVERSATIONS ====================

    async getConversations(user: CurrentUserData) {
        const vereadorId = this.getVereadorId(user);

        // Get conversation IDs where user is a participant
        const participations = await this.participantRepo.find({
            where: { userId: user.userId },
            select: ['conversationId'],
        });

        if (participations.length === 0) return [];

        const conversationIds = participations.map(p => p.conversationId);

        const conversations = await this.conversationRepo.find({
            where: { id: In(conversationIds) },
            relations: ['participants', 'participants.user'],
            order: { updatedAt: 'DESC' },
        });

        // For each conversation, get the last message and unread count
        const result = await Promise.all(conversations.map(async (conv) => {
            const lastMessage = await this.messageRepo.findOne({
                where: { conversationId: conv.id },
                order: { createdAt: 'DESC' },
                relations: ['sender'],
            });

            const unreadCount = await this.messageRepo.count({
                where: {
                    conversationId: conv.id,
                    readAt: null as any,
                },
            });

            // Subtract messages sent by the user from unread count
            const userSentUnread = await this.messageRepo.count({
                where: {
                    conversationId: conv.id,
                    senderId: user.userId,
                    readAt: null as any,
                },
            });

            return {
                ...conv,
                lastMessage: lastMessage ? {
                    content: lastMessage.content,
                    senderName: lastMessage.sender?.name || 'Desconhecido',
                    createdAt: lastMessage.createdAt,
                    hasAttachment: !!lastMessage.attachmentUrl,
                } : null,
                unreadCount: Math.max(0, unreadCount - userSentUnread),
            };
        }));

        return result;
    }

    async getMessages(conversationId: string, user: CurrentUserData, limit = 50, offset = 0) {
        // Verify user is a participant
        await this.verifyParticipant(conversationId, user.userId);

        const messages = await this.messageRepo.find({
            where: { conversationId },
            relations: ['sender'],
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });

        // Mark messages as read
        await this.messageRepo
            .createQueryBuilder()
            .update(ChatMessage)
            .set({ readAt: new Date() })
            .where('conversationId = :conversationId', { conversationId })
            .andWhere('senderId != :userId', { userId: user.userId })
            .andWhere('readAt IS NULL')
            .execute();

        return messages.reverse();
    }

    async sendMessage(conversationId: string, user: CurrentUserData, content: string, attachmentUrl?: string, attachmentName?: string) {
        await this.verifyParticipant(conversationId, user.userId);

        const message = this.messageRepo.create({
            content,
            senderId: user.userId,
            conversationId,
            attachmentUrl,
            attachmentName,
        });

        const saved = await this.messageRepo.save(message);

        // Update conversation's updatedAt
        await this.conversationRepo.update(conversationId, { updatedAt: new Date() });

        return this.messageRepo.findOne({
            where: { id: saved.id },
            relations: ['sender'],
        });
    }

    // ==================== DIRECT CONVERSATIONS ====================

    async createDirectConversation(user: CurrentUserData, targetUserId: string) {
        if (user.userId === targetUserId) {
            throw new BadRequestException('Não é possível criar conversa consigo mesmo');
        }

        const vereadorId = this.getVereadorId(user);

        // Check if direct conversation already exists between these two users
        const existing = await this.findExistingDirect(user.userId, targetUserId);
        if (existing) return existing;

        const conversation = this.conversationRepo.create({
            isGroup: false,
            createdById: user.userId,
            vereadorId,
        });

        const savedConv = await this.conversationRepo.save(conversation);

        // Add both participants
        await this.participantRepo.save([
            { conversationId: savedConv.id, userId: user.userId, role: ParticipantRole.MEMBER },
            { conversationId: savedConv.id, userId: targetUserId, role: ParticipantRole.MEMBER },
        ]);

        return this.conversationRepo.findOne({
            where: { id: savedConv.id },
            relations: ['participants', 'participants.user'],
        });
    }

    private async findExistingDirect(userId1: string, userId2: string) {
        const convs = await this.conversationRepo
            .createQueryBuilder('c')
            .innerJoin('c.participants', 'p1', 'p1.userId = :u1', { u1: userId1 })
            .innerJoin('c.participants', 'p2', 'p2.userId = :u2', { u2: userId2 })
            .where('c.isGroup = false')
            .getOne();

        if (convs) {
            return this.conversationRepo.findOne({
                where: { id: convs.id },
                relations: ['participants', 'participants.user'],
            });
        }
        return null;
    }

    // ==================== GROUP CONVERSATIONS ====================

    async createGroup(user: CurrentUserData, name: string, memberIds: string[]) {
        if (!name?.trim()) throw new BadRequestException('Nome do grupo é obrigatório');

        const vereadorId = this.getVereadorId(user);

        const conversation = this.conversationRepo.create({
            name: name.trim(),
            isGroup: true,
            createdById: user.userId,
            vereadorId,
        });

        const savedConv = await this.conversationRepo.save(conversation);

        // Add creator as admin
        const participants = [
            { conversationId: savedConv.id, userId: user.userId, role: ParticipantRole.ADMIN },
        ];

        // Add members
        const uniqueMembers = [...new Set(memberIds.filter(id => id !== user.userId))];
        for (const memberId of uniqueMembers) {
            participants.push({
                conversationId: savedConv.id,
                userId: memberId,
                role: ParticipantRole.MEMBER,
            });
        }

        await this.participantRepo.save(participants);

        return this.conversationRepo.findOne({
            where: { id: savedConv.id },
            relations: ['participants', 'participants.user'],
        });
    }

    async updateGroup(conversationId: string, user: CurrentUserData, name: string) {
        const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
        if (!conv || !conv.isGroup) throw new NotFoundException('Grupo não encontrado');

        await this.verifyParticipant(conversationId, user.userId);
        conv.name = name.trim();
        return this.conversationRepo.save(conv);
    }

    async addMember(conversationId: string, user: CurrentUserData, newUserId: string) {
        const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
        if (!conv || !conv.isGroup) throw new NotFoundException('Grupo não encontrado');

        await this.verifyParticipant(conversationId, user.userId);

        // Check not already a member
        const existing = await this.participantRepo.findOne({
            where: { conversationId, userId: newUserId },
        });
        if (existing) throw new BadRequestException('Usuário já é membro');

        return this.participantRepo.save({
            conversationId,
            userId: newUserId,
            role: ParticipantRole.MEMBER,
        });
    }

    async removeMember(conversationId: string, user: CurrentUserData, removeUserId: string) {
        const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
        if (!conv || !conv.isGroup) throw new NotFoundException('Grupo não encontrado');

        await this.verifyParticipant(conversationId, user.userId);

        await this.participantRepo.delete({ conversationId, userId: removeUserId });
        return { message: 'Membro removido com sucesso' };
    }

    async deleteGroup(conversationId: string, user: CurrentUserData) {
        const conv = await this.conversationRepo.findOne({
            where: { id: conversationId },
            relations: ['participants'],
        });
        if (!conv || !conv.isGroup) throw new NotFoundException('Grupo não encontrado');

        // Only admin participants or the creator can delete the group
        const participant = await this.verifyParticipant(conversationId, user.userId);
        if (participant.role !== ParticipantRole.ADMIN && conv.createdById !== user.userId) {
            throw new ForbiddenException('Apenas administradores podem excluir o grupo');
        }

        // Delete all messages, participants, then the conversation (cascade should handle this but being explicit)
        await this.messageRepo.delete({ conversationId });
        await this.participantRepo.delete({ conversationId });
        await this.conversationRepo.delete(conversationId);

        return { message: 'Grupo excluído com sucesso' };
    }

    async getConversationDetails(conversationId: string, user: CurrentUserData) {
        await this.verifyParticipant(conversationId, user.userId);

        return this.conversationRepo.findOne({
            where: { id: conversationId },
            relations: ['participants', 'participants.user'],
        });
    }

    // ==================== HELPERS ====================

    private async verifyParticipant(conversationId: string, userId: string) {
        const participant = await this.participantRepo.findOne({
            where: { conversationId, userId },
        });
        if (!participant) throw new ForbiddenException('Você não é participante desta conversa');
        return participant;
    }
}
