import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappLabel } from '../entities/whatsapp-label.entity';
import { WhatsappContact } from '../entities/whatsapp-contact.entity';

// ─── DTOs ───

export class CreateLabelDto {
    name: string;
    color?: string;
}

export class UpdateLabelDto {
    name?: string;
    color?: string;
}

/**
 * RF19: Serviço para gerenciamento de Labels (Tags) e associação a contatos/conversas.
 */
@Injectable()
export class WhatsappLabelService {
    private readonly logger = new Logger(WhatsappLabelService.name);

    constructor(
        @InjectRepository(WhatsappLabel)
        private readonly labelRepo: Repository<WhatsappLabel>,
        @InjectRepository(WhatsappContact)
        private readonly contactRepo: Repository<WhatsappContact>,
    ) { }

    // ─── Listar todas as labels do vereador ───
    async findAll(vereadorId: string): Promise<WhatsappLabel[]> {
        return this.labelRepo.find({
            where: { vereadorId },
            relations: ['contacts'],
            order: { name: 'ASC' },
        });
    }

    // ─── Buscar label por ID ───
    async findById(id: string, vereadorId: string): Promise<WhatsappLabel> {
        const label = await this.labelRepo.findOne({
            where: { id, vereadorId },
            relations: ['contacts'],
        });
        if (!label) throw new NotFoundException('Label não encontrada');
        return label;
    }

    // ─── Criar label ───
    async create(dto: CreateLabelDto, vereadorId: string): Promise<WhatsappLabel> {
        // Verificar duplicatas
        const existing = await this.labelRepo.findOne({
            where: { name: dto.name, vereadorId },
        });
        if (existing) {
            throw new BadRequestException(`Label "${dto.name}" já existe`);
        }

        const label = this.labelRepo.create({
            name: dto.name,
            color: dto.color || '#3B82F6',
            vereadorId,
        });
        return this.labelRepo.save(label);
    }

    // ─── Atualizar label ───
    async update(id: string, dto: UpdateLabelDto, vereadorId: string): Promise<WhatsappLabel> {
        const label = await this.findById(id, vereadorId);
        if (dto.name !== undefined) label.name = dto.name;
        if (dto.color !== undefined) label.color = dto.color;
        return this.labelRepo.save(label);
    }

    // ─── Deletar label ───
    async delete(id: string, vereadorId: string): Promise<void> {
        const label = await this.findById(id, vereadorId);
        await this.labelRepo.remove(label);
        this.logger.log(`🗑️ Label "${label.name}" removida`);
    }

    // ─── Associar label a um contato ───
    async addLabelToContact(labelId: string, contactId: string, vereadorId: string): Promise<WhatsappContact> {
        const label = await this.findById(labelId, vereadorId);
        const contact = await this.contactRepo.findOne({
            where: { id: contactId, vereadorId },
            relations: ['labels'],
        });
        if (!contact) throw new NotFoundException('Contato não encontrado');

        // Evitar duplicate
        if (!contact.labels.find(l => l.id === label.id)) {
            contact.labels.push(label);
            await this.contactRepo.save(contact);
        }
        return contact;
    }

    // ─── Remover label de um contato ───
    async removeLabelFromContact(labelId: string, contactId: string, vereadorId: string): Promise<WhatsappContact> {
        const contact = await this.contactRepo.findOne({
            where: { id: contactId, vereadorId },
            relations: ['labels'],
        });
        if (!contact) throw new NotFoundException('Contato não encontrado');

        contact.labels = contact.labels.filter(l => l.id !== labelId);
        return this.contactRepo.save(contact);
    }

    // ─── Listar contatos de uma label ───
    async getContactsByLabel(labelId: string, vereadorId: string): Promise<WhatsappContact[]> {
        const label = await this.labelRepo.findOne({
            where: { id: labelId, vereadorId },
            relations: ['contacts'],
        });
        if (!label) throw new NotFoundException('Label não encontrada');
        return label.contacts;
    }
}
