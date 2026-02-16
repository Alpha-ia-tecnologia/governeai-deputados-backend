import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffMember } from './staff.entity';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Injectable()
export class StaffService {
    constructor(
        @InjectRepository(StaffMember)
        private staffRepository: Repository<StaffMember>,
    ) { }

    async create(data: Partial<StaffMember>, currentUser: CurrentUserData): Promise<StaffMember> {
        let vereadorId: string;

        if (currentUser.role === UserRole.ADMIN) {
            if (!data.vereadorId) {
                throw new BadRequestException('Admin deve especificar o vereadorId');
            }
            vereadorId = data.vereadorId;
        } else {
            vereadorId = currentUser.vereadorId;
        }

        const staff = this.staffRepository.create({
            ...data,
            vereadorId,
        });
        return await this.staffRepository.save(staff);
    }

    async findAll(vereadorId: string | null): Promise<StaffMember[]> {
        if (!vereadorId) {
            return await this.staffRepository.find({ order: { name: 'ASC' } });
        }
        return await this.staffRepository.find({
            where: { vereadorId },
            order: { name: 'ASC' },
        });
    }

    async findOne(id: string, vereadorId: string | null): Promise<StaffMember> {
        const staff = await this.staffRepository.findOne({ where: { id } });
        if (!staff) {
            throw new NotFoundException('Membro da equipe não encontrado');
        }
        if (vereadorId && staff.vereadorId !== vereadorId) {
            throw new ForbiddenException('Acesso negado');
        }
        return staff;
    }

    async update(id: string, data: Partial<StaffMember>, vereadorId: string | null): Promise<StaffMember> {
        const staff = await this.findOne(id, vereadorId);
        const { vereadorId: _, ...dataToUpdate } = data as any;
        Object.assign(staff, dataToUpdate);
        return await this.staffRepository.save(staff);
    }

    async remove(id: string, vereadorId: string | null): Promise<void> {
        const staff = await this.findOne(id, vereadorId);
        await this.staffRepository.remove(staff);
    }

    async getActiveCount(vereadorId: string | null): Promise<number> {
        const where: any = { active: true };
        if (vereadorId) {
            where.vereadorId = vereadorId;
        }
        return await this.staffRepository.count({ where });
    }
}
