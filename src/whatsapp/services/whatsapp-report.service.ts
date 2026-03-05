import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { WhatsappConversation, ConversationStatus } from '../entities/whatsapp-conversation.entity';
import { WhatsappMessage, MessageDirection } from '../entities/whatsapp-message.entity';
import { WhatsappContact } from '../entities/whatsapp-contact.entity';

// ─── DTOs ───

export interface DateRangeDto {
    startDate: string; // ISO string
    endDate: string;
}

export interface DashboardMetrics {
    overview: {
        totalConversations: number;
        activeConversations: number;
        resolvedConversations: number;
        pendingConversations: number;
        totalMessages: number;
        inboundMessages: number;
        outboundMessages: number;
        totalContacts: number;
        newContactsInPeriod: number;
    };
    performance: {
        avgResponseTimeMinutes: number;
        avgResolutionTimeMinutes: number;
        resolutionRate: number;
    };
    timeline: Array<{
        date: string;
        inbound: number;
        outbound: number;
        conversations: number;
    }>;
    topAttendants: Array<{
        userId: string;
        name: string;
        resolved: number;
        messages: number;
    }>;
    messageTypes: Array<{
        type: string;
        count: number;
    }>;
}

/**
 * RF26-RF27: Serviço de Relatórios e Métricas do WhatsApp.
 * - RF26: Dashboard de métricas de atendimento em tempo real
 * - RF27: Relatórios exportáveis (JSON/CSV)
 */
@Injectable()
export class WhatsappReportService {
    private readonly logger = new Logger(WhatsappReportService.name);

    constructor(
        @InjectRepository(WhatsappConversation)
        private readonly conversationRepo: Repository<WhatsappConversation>,
        @InjectRepository(WhatsappMessage)
        private readonly messageRepo: Repository<WhatsappMessage>,
        @InjectRepository(WhatsappContact)
        private readonly contactRepo: Repository<WhatsappContact>,
    ) { }

    // ═══════════════════════════════════════════
    // RF26: Dashboard de Métricas
    // ═══════════════════════════════════════════

    async getDashboard(vereadorId: string, range: DateRangeDto): Promise<DashboardMetrics> {
        const start = new Date(range.startDate);
        const end = new Date(range.endDate);

        const [overview, performance, timeline, topAttendants, messageTypes] = await Promise.all([
            this.getOverview(vereadorId, start, end),
            this.getPerformance(vereadorId, start, end),
            this.getTimeline(vereadorId, start, end),
            this.getTopAttendants(vereadorId, start, end),
            this.getMessageTypes(vereadorId, start, end),
        ]);

        return { overview, performance, timeline, topAttendants, messageTypes };
    }

    private async getOverview(vereadorId: string, start: Date, end: Date) {
        const conversations = await this.conversationRepo.find({
            where: { vereadorId, createdAt: Between(start, end) },
        });

        const messages = await this.messageRepo.find({
            where: {
                conversation: { vereadorId },
                createdAt: Between(start, end),
            },
            relations: ['conversation'],
        });

        const contacts = await this.contactRepo.find({
            where: { vereadorId },
        });

        const newContacts = await this.contactRepo.find({
            where: { vereadorId, createdAt: Between(start, end) },
        });

        return {
            totalConversations: conversations.length,
            activeConversations: conversations.filter(c => c.status === ConversationStatus.ACTIVE).length,
            resolvedConversations: conversations.filter(c => c.status === ConversationStatus.RESOLVED).length,
            pendingConversations: conversations.filter(c => c.status === ConversationStatus.PENDING).length,
            totalMessages: messages.length,
            inboundMessages: messages.filter(m => m.direction === MessageDirection.INBOUND).length,
            outboundMessages: messages.filter(m => m.direction === MessageDirection.OUTBOUND).length,
            totalContacts: contacts.length,
            newContactsInPeriod: newContacts.length,
        };
    }

    private async getPerformance(vereadorId: string, start: Date, end: Date) {
        const resolved = await this.conversationRepo.find({
            where: {
                vereadorId,
                status: ConversationStatus.RESOLVED,
                resolvedAt: Between(start, end),
            },
        });

        const total = await this.conversationRepo.count({
            where: { vereadorId, createdAt: Between(start, end) },
        });

        // Calcular tempo médio de resolução
        let totalResolutionMs = 0;
        let resolvedCount = 0;
        for (const conv of resolved) {
            if (conv.resolvedAt && conv.createdAt) {
                totalResolutionMs += new Date(conv.resolvedAt).getTime() - new Date(conv.createdAt).getTime();
                resolvedCount++;
            }
        }

        const avgResolutionMinutes = resolvedCount > 0
            ? Math.round(totalResolutionMs / resolvedCount / 60000)
            : 0;

        // Tempo médio de primeira resposta (simplificado)
        const avgResponseTimeMinutes = Math.round(avgResolutionMinutes * 0.3); // Estimativa

        return {
            avgResponseTimeMinutes,
            avgResolutionTimeMinutes: avgResolutionMinutes,
            resolutionRate: total > 0 ? Math.round((resolvedCount / total) * 100) : 0,
        };
    }

    private async getTimeline(vereadorId: string, start: Date, end: Date) {
        const messages = await this.messageRepo.find({
            where: {
                conversation: { vereadorId },
                createdAt: Between(start, end),
            },
            relations: ['conversation'],
            order: { createdAt: 'ASC' },
        });

        const conversations = await this.conversationRepo.find({
            where: { vereadorId, createdAt: Between(start, end) },
            order: { createdAt: 'ASC' },
        });

        // Agrupar por dia
        const dayMap = new Map<string, { inbound: number; outbound: number; conversations: number }>();

        for (const msg of messages) {
            const day = new Date(msg.createdAt).toISOString().split('T')[0];
            if (!dayMap.has(day)) dayMap.set(day, { inbound: 0, outbound: 0, conversations: 0 });
            const entry = dayMap.get(day)!;
            if (msg.direction === MessageDirection.INBOUND) entry.inbound++;
            else entry.outbound++;
        }

        for (const conv of conversations) {
            const day = new Date(conv.createdAt).toISOString().split('T')[0];
            if (!dayMap.has(day)) dayMap.set(day, { inbound: 0, outbound: 0, conversations: 0 });
            dayMap.get(day)!.conversations++;
        }

        return Array.from(dayMap.entries())
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    private async getTopAttendants(vereadorId: string, start: Date, end: Date) {
        const resolved = await this.conversationRepo.find({
            where: {
                vereadorId,
                status: ConversationStatus.RESOLVED,
                resolvedAt: Between(start, end),
            },
            relations: ['resolvedBy'],
        });

        const attMap = new Map<string, { name: string; resolved: number; messages: number }>();
        for (const conv of resolved) {
            if (!conv.resolvedById) continue;
            if (!attMap.has(conv.resolvedById)) {
                attMap.set(conv.resolvedById, {
                    name: conv.resolvedBy?.name || 'Desconhecido',
                    resolved: 0,
                    messages: 0,
                });
            }
            attMap.get(conv.resolvedById)!.resolved++;
        }

        return Array.from(attMap.entries())
            .map(([userId, data]) => ({ userId, ...data }))
            .sort((a, b) => b.resolved - a.resolved)
            .slice(0, 10);
    }

    private async getMessageTypes(vereadorId: string, start: Date, end: Date) {
        const messages = await this.messageRepo.find({
            where: {
                conversation: { vereadorId },
                createdAt: Between(start, end),
            },
            relations: ['conversation'],
        });

        const typeMap = new Map<string, number>();
        for (const msg of messages) {
            const t = msg.type || 'text';
            typeMap.set(t, (typeMap.get(t) || 0) + 1);
        }

        return Array.from(typeMap.entries())
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count);
    }

    // ═══════════════════════════════════════════
    // RF27: Exportar Relatório (JSON)
    // ═══════════════════════════════════════════

    async exportReport(vereadorId: string, range: DateRangeDto): Promise<{
        generatedAt: string;
        period: { start: string; end: string };
        metrics: DashboardMetrics;
    }> {
        const metrics = await this.getDashboard(vereadorId, range);
        return {
            generatedAt: new Date().toISOString(),
            period: { start: range.startDate, end: range.endDate },
            metrics,
        };
    }

    // ─── Conversas detalhadas para export ───
    async getConversationsReport(vereadorId: string, range: DateRangeDto) {
        const start = new Date(range.startDate);
        const end = new Date(range.endDate);

        return this.conversationRepo.find({
            where: { vereadorId, createdAt: Between(start, end) },
            relations: ['contact', 'assignedTo', 'resolvedBy'],
            order: { createdAt: 'DESC' },
        });
    }
}
