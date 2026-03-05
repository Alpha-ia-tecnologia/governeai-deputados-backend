import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappBotFlow, BotFlowStatus, BotStepType } from '../entities/whatsapp-bot-flow.entity';
import type { BotStep } from '../entities/whatsapp-bot-flow.entity';
import { WhatsappConversation } from '../entities/whatsapp-conversation.entity';
import { WhatsappApiService } from './whatsapp-api.service';

// ─── DTOs ───

export class CreateBotFlowDto {
    name: string;
    description?: string;
    steps: BotStep[];
    entryStepId: string;
    triggerKeywords?: string[];
    isDefault?: boolean;
}

export class UpdateBotFlowDto {
    name?: string;
    description?: string;
    status?: BotFlowStatus;
    steps?: BotStep[];
    entryStepId?: string;
    triggerKeywords?: string[];
    isDefault?: boolean;
}

/**
 * RF21-RF23: Motor de automação de Bot.
 * - RF21: Respostas automáticas iniciais (saudação, menu)
 * - RF22: Fluxos de atendimento configuráveis
 * - RF23: Handoff bot → humano
 */
@Injectable()
export class WhatsappBotService {
    private readonly logger = new Logger(WhatsappBotService.name);

    constructor(
        @InjectRepository(WhatsappBotFlow)
        private readonly flowRepo: Repository<WhatsappBotFlow>,
        @InjectRepository(WhatsappConversation)
        private readonly conversationRepo: Repository<WhatsappConversation>,
        private readonly apiService: WhatsappApiService,
    ) { }

    // ═══════════════════════════════════════════
    // CRUD de Fluxos
    // ═══════════════════════════════════════════

    async findAll(vereadorId: string): Promise<WhatsappBotFlow[]> {
        return this.flowRepo.find({
            where: { vereadorId },
            order: { updatedAt: 'DESC' },
        });
    }

    async findById(id: string, vereadorId: string): Promise<WhatsappBotFlow> {
        const flow = await this.flowRepo.findOne({ where: { id, vereadorId } });
        if (!flow) throw new NotFoundException('Fluxo não encontrado');
        return flow;
    }

    async create(dto: CreateBotFlowDto, vereadorId: string): Promise<WhatsappBotFlow> {
        // Se for default, desativar defaults existentes
        if (dto.isDefault) {
            await this.flowRepo.update(
                { vereadorId, isDefault: true },
                { isDefault: false },
            );
        }

        const flow = this.flowRepo.create({
            ...dto,
            vereadorId,
            status: BotFlowStatus.INACTIVE,
        });
        return this.flowRepo.save(flow);
    }

    async update(id: string, dto: UpdateBotFlowDto, vereadorId: string): Promise<WhatsappBotFlow> {
        const flow = await this.findById(id, vereadorId);

        if (dto.isDefault) {
            await this.flowRepo.update(
                { vereadorId, isDefault: true },
                { isDefault: false },
            );
        }

        if (dto.name !== undefined) flow.name = dto.name;
        if (dto.description !== undefined) flow.description = dto.description;
        if (dto.status !== undefined) flow.status = dto.status;
        if (dto.steps !== undefined) flow.steps = dto.steps;
        if (dto.entryStepId !== undefined) flow.entryStepId = dto.entryStepId;
        if (dto.triggerKeywords !== undefined) flow.triggerKeywords = dto.triggerKeywords;
        if (dto.isDefault !== undefined) flow.isDefault = dto.isDefault;

        return this.flowRepo.save(flow);
    }

    async delete(id: string, vereadorId: string): Promise<void> {
        const flow = await this.findById(id, vereadorId);
        await this.flowRepo.remove(flow);
    }

    async toggleStatus(id: string, vereadorId: string): Promise<WhatsappBotFlow> {
        const flow = await this.findById(id, vereadorId);
        flow.status = flow.status === BotFlowStatus.ACTIVE
            ? BotFlowStatus.INACTIVE
            : BotFlowStatus.ACTIVE;
        return this.flowRepo.save(flow);
    }

    // ═══════════════════════════════════════════
    // RF21: Motor de Automação
    // ═══════════════════════════════════════════

    /**
     * Processa uma mensagem inbound para ver se o bot deve responder.
     * Retorna true se o bot tratou a mensagem.
     */
    async processInboundMessage(
        vereadorId: string,
        conversation: WhatsappConversation,
        messageText: string,
        senderPhone: string,
    ): Promise<boolean> {
        // Se o bot está desativado nesta conversa, não interceptar
        if (!conversation.isBotActive) {
            return false;
        }

        // Encontrar fluxo ativo aplicável
        const flow = await this.findActiveFlow(vereadorId, messageText);
        if (!flow) {
            return false;
        }

        // Determinar step atual
        const currentStepId = this.getCurrentStepId(conversation) || flow.entryStepId;
        const step = flow.steps.find(s => s.id === currentStepId);

        if (!step) {
            this.logger.warn(`Step não encontrado: ${currentStepId}`);
            return false;
        }

        await this.executeStep(flow, step, conversation, messageText, senderPhone);
        return true;
    }

    // ─── Encontrar fluxo ativo por keyword ou default ───
    private async findActiveFlow(vereadorId: string, messageText: string): Promise<WhatsappBotFlow | null> {
        const activeFlows = await this.flowRepo.find({
            where: { vereadorId, status: BotFlowStatus.ACTIVE },
        });

        if (activeFlows.length === 0) return null;

        // Procurar por keyword
        const normalizedMsg = messageText.toLowerCase().trim();
        for (const flow of activeFlows) {
            if (flow.triggerKeywords?.some(kw => normalizedMsg.includes(kw.toLowerCase()))) {
                return flow;
            }
        }

        // Usar fluxo default se existir
        const defaultFlow = activeFlows.find(f => f.isDefault);
        return defaultFlow || null;
    }

    // ─── Executar um step do fluxo ───
    private async executeStep(
        flow: WhatsappBotFlow,
        step: BotStep,
        conversation: WhatsappConversation,
        userMessage: string,
        senderPhone: string,
    ): Promise<void> {
        switch (step.type) {
            case BotStepType.GREETING:
            case BotStepType.TEXT_RESPONSE:
                await this.apiService.sendTextMessage(senderPhone, step.message);
                // Avançar para próximo step
                if (step.nextStepId) {
                    await this.setCurrentStepId(conversation, step.nextStepId);
                }
                break;

            case BotStepType.MENU:
                // Enviar mensagem com opções
                if (step.options && step.options.length > 0) {
                    const menuText = step.message + '\n\n' + step.options.map(
                        (opt, i) => `${i + 1}️⃣ ${opt.label}`
                    ).join('\n');
                    await this.apiService.sendTextMessage(senderPhone, menuText);
                    await this.setCurrentStepId(conversation, step.id); // fica no menu aguardando
                } else {
                    await this.apiService.sendTextMessage(senderPhone, step.message);
                }
                break;

            case BotStepType.COLLECT_INFO:
                // Enviar pergunta e registrar que estamos coletando
                await this.apiService.sendTextMessage(senderPhone, step.message);
                if (step.nextStepId) {
                    await this.setCurrentStepId(conversation, step.nextStepId);
                }
                break;

            case BotStepType.TRANSFER_TO_HUMAN:
                // RF23: Handoff para humano
                await this.apiService.sendTextMessage(senderPhone, step.message || 'Transferindo para um atendente. Por favor, aguarde...');
                conversation.isBotActive = false;
                conversation.status = 'pending' as any;
                await this.conversationRepo.save(conversation);
                this.logger.log(`🤖→👤 Handoff: conversa ${conversation.id} transferida para humano`);
                break;

            case BotStepType.END:
                await this.apiService.sendTextMessage(senderPhone, step.message || 'Obrigado pelo contato! 😊');
                // Resetar step
                await this.setCurrentStepId(conversation, '');
                break;

            default:
                this.logger.warn(`Tipo de step desconhecido: ${step.type}`);
        }

        // Processar resposta de menu (se o step anterior era menu)
        await this.processMenuResponse(flow, step, conversation, userMessage, senderPhone);
    }

    // ─── Processar resposta de menu ───
    private async processMenuResponse(
        flow: WhatsappBotFlow,
        currentStep: BotStep,
        conversation: WhatsappConversation,
        userMessage: string,
        senderPhone: string,
    ): Promise<void> {
        if (currentStep.type !== BotStepType.MENU || !currentStep.options) return;

        const normalizedMsg = userMessage.trim().toLowerCase();

        // Encontrar opção selecionada (por número ou texto)
        const selectedOption = currentStep.options.find((opt, i) => {
            const num = String(i + 1);
            return normalizedMsg === num
                || normalizedMsg === opt.value.toLowerCase()
                || normalizedMsg === opt.label.toLowerCase();
        });

        if (selectedOption?.nextStepId) {
            const nextStep = flow.steps.find(s => s.id === selectedOption.nextStepId);
            if (nextStep) {
                await this.executeStep(flow, nextStep, conversation, userMessage, senderPhone);
            }
        }
    }

    // ─── Helpers de estado ───
    private getCurrentStepId(conversation: WhatsappConversation): string | null {
        // Armazena o step atual em metadados da conversa
        // Usando um campo simples: botCurrentStepId (cast para any por simplicidade)
        return (conversation as any).botCurrentStepId || null;
    }

    private async setCurrentStepId(conversation: WhatsappConversation, stepId: string): Promise<void> {
        (conversation as any).botCurrentStepId = stepId;
        await this.conversationRepo.save(conversation);
    }

    // ═══════════════════════════════════════════
    // Templates de fluxo pré-configurados
    // ═══════════════════════════════════════════

    getFlowTemplates(): Array<{ name: string; description: string; steps: BotStep[]; entryStepId: string }> {
        return [
            {
                name: 'Atendimento Básico',
                description: 'Saudação inicial com menu de opções e handoff',
                entryStepId: 'greeting',
                steps: [
                    {
                        id: 'greeting',
                        type: BotStepType.GREETING,
                        message: 'Olá! 👋 Bem-vindo ao atendimento do gabinete. Como posso ajudá-lo?',
                        nextStepId: 'main_menu',
                    },
                    {
                        id: 'main_menu',
                        type: BotStepType.MENU,
                        message: 'Selecione uma opção:',
                        options: [
                            { label: 'Falar com atendente', value: 'atendente', nextStepId: 'transfer' },
                            { label: 'Informações', value: 'info', nextStepId: 'info' },
                            { label: 'Registrar solicitação', value: 'solicitar', nextStepId: 'collect_name' },
                        ],
                    },
                    {
                        id: 'info',
                        type: BotStepType.TEXT_RESPONSE,
                        message: 'Nosso gabinete funciona de segunda a sexta, das 8h às 18h. Para mais informações, acesse nosso site ou fale com um atendente.',
                        nextStepId: 'main_menu',
                    },
                    {
                        id: 'collect_name',
                        type: BotStepType.COLLECT_INFO,
                        message: 'Por favor, informe seu nome completo:',
                        collectField: 'name',
                        nextStepId: 'transfer',
                    },
                    {
                        id: 'transfer',
                        type: BotStepType.TRANSFER_TO_HUMAN,
                        message: 'Estou transferindo você para um atendente. Por favor, aguarde um momento... 🙏',
                    },
                ],
            },
            {
                name: 'Horário de Atendimento',
                description: 'Resposta automática fora do expediente',
                entryStepId: 'after_hours',
                steps: [
                    {
                        id: 'after_hours',
                        type: BotStepType.TEXT_RESPONSE,
                        message: '⏰ Nosso atendimento funciona de segunda a sexta, das 8h às 18h.\n\nSua mensagem foi registrada e será respondida no próximo dia útil.\n\nObrigado pela compreensão! 🙏',
                        nextStepId: 'end',
                    },
                    {
                        id: 'end',
                        type: BotStepType.END,
                        message: '',
                    },
                ],
            },
        ];
    }
}
