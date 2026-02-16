import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PoliticalContact, PoliticalRole } from './political-contact.entity';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Injectable()
export class PoliticalContactsService {
    constructor(
        @InjectRepository(PoliticalContact)
        private contactsRepository: Repository<PoliticalContact>,
    ) { }

    async create(data: Partial<PoliticalContact>, currentUser: CurrentUserData): Promise<PoliticalContact> {
        let vereadorId: string;
        if (currentUser.role === UserRole.ADMIN) {
            if (!data.vereadorId) throw new BadRequestException('Admin deve especificar o vereadorId');
            vereadorId = data.vereadorId;
        } else {
            vereadorId = currentUser.vereadorId;
        }
        const contact = this.contactsRepository.create({ ...data, vereadorId });
        return await this.contactsRepository.save(contact);
    }

    async findAll(vereadorId: string | null): Promise<PoliticalContact[]> {
        if (!vereadorId) {
            return await this.contactsRepository.find({ order: { name: 'ASC' } });
        }
        return await this.contactsRepository.find({ where: { vereadorId }, order: { name: 'ASC' } });
    }

    async findByRole(role: PoliticalRole, vereadorId: string | null): Promise<PoliticalContact[]> {
        const where: any = { politicalRole: role };
        if (vereadorId) where.vereadorId = vereadorId;
        return await this.contactsRepository.find({ where, order: { name: 'ASC' } });
    }

    async findByCity(city: string, vereadorId: string | null): Promise<PoliticalContact[]> {
        const where: any = {};
        if (vereadorId) where.vereadorId = vereadorId;

        const queryBuilder = this.contactsRepository.createQueryBuilder('contact')
            .where('LOWER(contact.city) = LOWER(:city)', { city });

        if (vereadorId) {
            queryBuilder.andWhere('contact.vereadorId = :vereadorId', { vereadorId });
        }

        return await queryBuilder.orderBy('contact.name', 'ASC').getMany();
    }

    async findOne(id: string, vereadorId: string | null): Promise<PoliticalContact> {
        const contact = await this.contactsRepository.findOne({ where: { id } });
        if (!contact) throw new NotFoundException('Contato político não encontrado');
        if (vereadorId && contact.vereadorId !== vereadorId) throw new ForbiddenException('Acesso negado');
        return contact;
    }

    async update(id: string, data: Partial<PoliticalContact>, vereadorId: string | null): Promise<PoliticalContact> {
        const contact = await this.findOne(id, vereadorId);
        const { vereadorId: _, ...dataToUpdate } = data as any;
        Object.assign(contact, dataToUpdate);
        return await this.contactsRepository.save(contact);
    }

    async remove(id: string, vereadorId: string | null): Promise<void> {
        const contact = await this.findOne(id, vereadorId);
        await this.contactsRepository.remove(contact);
    }
}
