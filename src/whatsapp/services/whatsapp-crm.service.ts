import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { WhatsappContact } from '../entities/whatsapp-contact.entity';

// ─── DTOs ───

export class UpdateContactCrmDto {
    name?: string;
    email?: string;
    cpf?: string;
    notes?: string;
    companyName?: string;
    linkedVoterId?: string;
}

/**
 * RF20: Serviço CRM para enriquecimento de contatos WhatsApp.
 * Gerencia dados complementares como e-mail, CPF, empresa, notas e vínculo com eleitor.
 */
@Injectable()
export class WhatsappCrmService {
    private readonly logger = new Logger(WhatsappCrmService.name);

    constructor(
        @InjectRepository(WhatsappContact)
        private readonly contactRepo: Repository<WhatsappContact>,
    ) { }

    // ─── Listar todos os contatos do vereador ───
    async findAll(vereadorId: string, search?: string): Promise<WhatsappContact[]> {
        const where: any = { vereadorId };

        if (search) {
            return this.contactRepo.find({
                where: [
                    { vereadorId, name: Like(`%${search}%`) },
                    { vereadorId, phone: Like(`%${search}%`) },
                    { vereadorId, email: Like(`%${search}%`) },
                    { vereadorId, companyName: Like(`%${search}%`) },
                ],
                relations: ['labels'],
                order: { updatedAt: 'DESC' },
            });
        }

        return this.contactRepo.find({
            where,
            relations: ['labels'],
            order: { updatedAt: 'DESC' },
        });
    }

    // ─── Buscar contato por ID ───
    async findById(id: string, vereadorId: string): Promise<WhatsappContact> {
        const contact = await this.contactRepo.findOne({
            where: { id, vereadorId },
            relations: ['labels'],
        });
        if (!contact) throw new NotFoundException('Contato não encontrado');
        return contact;
    }

    // ─── RF20: Atualizar dados CRM do contato ───
    async updateCrm(id: string, dto: UpdateContactCrmDto, vereadorId: string): Promise<WhatsappContact> {
        const contact = await this.findById(id, vereadorId);

        if (dto.name !== undefined) contact.name = dto.name;
        if (dto.email !== undefined) contact.email = dto.email;
        if (dto.cpf !== undefined) contact.cpf = dto.cpf;
        if (dto.notes !== undefined) contact.notes = dto.notes;
        if (dto.companyName !== undefined) contact.companyName = dto.companyName;
        if (dto.linkedVoterId !== undefined) contact.linkedVoterId = dto.linkedVoterId;

        this.logger.log(`📇 Contato CRM atualizado: ${contact.phone}`);
        return this.contactRepo.save(contact);
    }

    // ─── Estatísticas ───
    async getStats(vereadorId: string): Promise<{
        total: number;
        withEmail: number;
        withCpf: number;
        withCompany: number;
        linkedToVoter: number;
    }> {
        const contacts = await this.contactRepo.find({ where: { vereadorId } });
        return {
            total: contacts.length,
            withEmail: contacts.filter(c => c.email).length,
            withCpf: contacts.filter(c => c.cpf).length,
            withCompany: contacts.filter(c => c.companyName).length,
            linkedToVoter: contacts.filter(c => c.linkedVoterId).length,
        };
    }
}
