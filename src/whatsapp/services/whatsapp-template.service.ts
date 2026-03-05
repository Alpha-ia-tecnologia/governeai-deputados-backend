import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappTemplate, TemplateStatus, TemplateCategory } from '../entities/whatsapp-template.entity';
import { WhatsappApiService } from './whatsapp-api.service';

// ─── DTOs ───

export class CreateTemplateDto {
    name: string;
    language?: string;
    category: TemplateCategory;
    components: any[];
}

export class UpdateTemplateDto {
    name?: string;
    language?: string;
    category?: TemplateCategory;
    components?: any[];
}

export class SendTemplateDto {
    phone: string;
    templateName: string;
    languageCode?: string;
    components?: any[];
}

/**
 * RF15-RF17: Serviço para gerenciamento de Templates de Mensagem (HSM).
 * - RF15: Criar/editar templates e submetê-los à Meta para aprovação
 * - RF16: Preenchimento de variáveis em componentes de template
 * - RF17: Disparo de conversa ativa via template aprovado
 */
@Injectable()
export class WhatsappTemplateService {
    private readonly logger = new Logger(WhatsappTemplateService.name);

    constructor(
        @InjectRepository(WhatsappTemplate)
        private readonly templateRepo: Repository<WhatsappTemplate>,
        private readonly apiService: WhatsappApiService,
    ) { }

    // ─── RF15: Listar templates do vereador ───
    async findAll(vereadorId: string): Promise<WhatsappTemplate[]> {
        return this.templateRepo.find({
            where: { vereadorId },
            order: { updatedAt: 'DESC' },
        });
    }

    // ─── RF15: Buscar template por ID ───
    async findById(id: string, vereadorId: string): Promise<WhatsappTemplate> {
        const template = await this.templateRepo.findOne({ where: { id, vereadorId } });
        if (!template) throw new NotFoundException('Template não encontrado');
        return template;
    }

    // ─── RF15: Criar template local e submeter à Meta ───
    async create(dto: CreateTemplateDto, vereadorId: string): Promise<WhatsappTemplate> {
        // Validar nome do template (apenas lowercase, underscore e sem espaços)
        if (!/^[a-z0-9_]+$/.test(dto.name)) {
            throw new BadRequestException(
                'Nome do template deve conter apenas letras minúsculas, números e underscores',
            );
        }

        // Verificar duplicatas
        const existing = await this.templateRepo.findOne({
            where: { name: dto.name, vereadorId },
        });
        if (existing) {
            throw new BadRequestException(`Template "${dto.name}" já existe`);
        }

        // Criar registro local
        const template = this.templateRepo.create({
            name: dto.name,
            language: dto.language || 'pt_BR',
            category: dto.category,
            components: dto.components,
            status: TemplateStatus.PENDING,
            vereadorId,
        });

        // Submeter à Meta Graph API
        try {
            const { templateId } = await this.apiService.createTemplate(
                dto.name,
                template.language,
                dto.category,
                dto.components,
            );
            template.metaTemplateId = templateId;
            this.logger.log(`✅ Template "${dto.name}" submetido à Meta: ${templateId}`);
        } catch (error) {
            this.logger.warn(`⚠️ Template "${dto.name}" salvo localmente, mas falhou na Meta: ${error.message}`);
            // Salvar mesmo assim para permitir retry depois
        }

        return this.templateRepo.save(template);
    }

    // ─── RF15: Atualizar template local ───
    async update(id: string, dto: UpdateTemplateDto, vereadorId: string): Promise<WhatsappTemplate> {
        const template = await this.findById(id, vereadorId);

        if (dto.name !== undefined) template.name = dto.name;
        if (dto.language !== undefined) template.language = dto.language;
        if (dto.category !== undefined) template.category = dto.category;
        if (dto.components !== undefined) template.components = dto.components;

        // Se atualizar componentes, volta para PENDING
        if (dto.components) {
            template.status = TemplateStatus.PENDING;
        }

        return this.templateRepo.save(template);
    }

    // ─── Deletar template ───
    async delete(id: string, vereadorId: string): Promise<void> {
        const template = await this.findById(id, vereadorId);
        await this.templateRepo.remove(template);
        this.logger.log(`🗑️ Template "${template.name}" removido`);
    }

    // ─── RF15: Sincronizar status dos templates com a Meta ───
    async syncFromMeta(vereadorId: string): Promise<{ synced: number }> {
        const templates = await this.templateRepo.find({ where: { vereadorId } });
        let synced = 0;

        // Nota: Em produção, este método consultaria GET /{waba_id}/message_templates
        // para obter o status atualizado de cada template.
        // Por enquanto, marcamos como log de placeholder.
        this.logger.log(`🔄 Sync de ${templates.length} templates solicitado para vereador ${vereadorId}`);

        return { synced };
    }

    // ─── RF16: Extrair variáveis de um template ───
    extractVariables(template: WhatsappTemplate): Array<{ component: string; index: number; example?: string }> {
        const variables: Array<{ component: string; index: number; example?: string }> = [];

        for (const component of template.components) {
            const text = component.text || '';
            const regex = /\{\{(\d+)\}\}/g;
            let match;

            while ((match = regex.exec(text)) !== null) {
                variables.push({
                    component: component.type || 'body',
                    index: parseInt(match[1]),
                    example: component.example?.body_text?.[0]?.[parseInt(match[1]) - 1] || undefined,
                });
            }
        }

        return variables;
    }

    // ─── RF16: Preencher variáveis do template ───
    fillVariables(
        template: WhatsappTemplate,
        values: Record<string, string>,
    ): any[] {
        const components: any[] = [];

        for (const comp of template.components) {
            if (!comp.text) continue;

            const regex = /\{\{(\d+)\}\}/g;
            const matches = [...comp.text.matchAll(regex)];

            if (matches.length > 0) {
                const parameters = matches.map(m => ({
                    type: 'text',
                    text: values[`${comp.type}_${m[1]}`] || values[m[1]] || `{{${m[1]}}}`,
                }));

                components.push({
                    type: comp.type?.toLowerCase() || 'body',
                    parameters,
                });
            }
        }

        return components;
    }

    // ─── RF17: Enviar template para iniciar conversa ───
    async sendTemplate(
        dto: SendTemplateDto,
        vereadorId: string,
    ): Promise<{ messageId: string }> {
        // Buscar template no banco
        const template = await this.templateRepo.findOne({
            where: { name: dto.templateName, vereadorId },
        });

        if (!template) {
            throw new NotFoundException(`Template "${dto.templateName}" não encontrado`);
        }

        if (template.status !== TemplateStatus.APPROVED) {
            throw new BadRequestException(
                `Template "${dto.templateName}" não está aprovado (status: ${template.status})`,
            );
        }

        return this.apiService.sendTemplateMessage(
            dto.phone,
            dto.templateName,
            dto.languageCode || template.language,
            dto.components,
        );
    }

    // ─── RF17: Buscar templates aprovados (para seleção no chat) ───
    async findApproved(vereadorId: string): Promise<WhatsappTemplate[]> {
        return this.templateRepo.find({
            where: { vereadorId, status: TemplateStatus.APPROVED },
            order: { name: 'ASC' },
        });
    }
}
