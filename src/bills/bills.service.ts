import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LegislativeBill, BillStatus, BillAuthorship } from './bill.entity';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Injectable()
export class BillsService {
    constructor(
        @InjectRepository(LegislativeBill)
        private billsRepository: Repository<LegislativeBill>,
    ) { }

    async create(data: Partial<LegislativeBill>, currentUser: CurrentUserData): Promise<LegislativeBill> {
        let vereadorId: string;
        if (currentUser.role === UserRole.ADMIN) {
            if (!data.vereadorId) throw new BadRequestException('Admin deve especificar o vereadorId');
            vereadorId = data.vereadorId;
        } else {
            vereadorId = currentUser.vereadorId;
        }
        const bill = this.billsRepository.create({ ...data, vereadorId });
        return await this.billsRepository.save(bill);
    }

    async findAll(vereadorId: string | null): Promise<LegislativeBill[]> {
        if (!vereadorId) {
            return await this.billsRepository.find({ order: { presentedDate: 'DESC' } });
        }
        return await this.billsRepository.find({ where: { vereadorId }, order: { presentedDate: 'DESC' } });
    }

    async findByAuthorship(authorship: BillAuthorship, vereadorId: string | null): Promise<LegislativeBill[]> {
        const where: any = { authorship };
        if (vereadorId) where.vereadorId = vereadorId;
        return await this.billsRepository.find({ where, order: { presentedDate: 'DESC' } });
    }

    async findByStatus(status: BillStatus, vereadorId: string | null): Promise<LegislativeBill[]> {
        const where: any = { status };
        if (vereadorId) where.vereadorId = vereadorId;
        return await this.billsRepository.find({ where, order: { presentedDate: 'DESC' } });
    }

    async findOne(id: string, vereadorId: string | null): Promise<LegislativeBill> {
        const bill = await this.billsRepository.findOne({ where: { id } });
        if (!bill) throw new NotFoundException('Projeto de lei não encontrado');
        if (vereadorId && bill.vereadorId !== vereadorId) throw new ForbiddenException('Acesso negado');
        return bill;
    }

    async update(id: string, data: Partial<LegislativeBill>, vereadorId: string | null): Promise<LegislativeBill> {
        const bill = await this.findOne(id, vereadorId);
        const { vereadorId: _, ...dataToUpdate } = data as any;
        Object.assign(bill, dataToUpdate);
        return await this.billsRepository.save(bill);
    }

    async remove(id: string, vereadorId: string | null): Promise<void> {
        const bill = await this.findOne(id, vereadorId);
        await this.billsRepository.remove(bill);
    }

    async getStats(vereadorId: string | null): Promise<{ total: number; em_tramitacao: number; aprovado: number; rejeitado: number; proprio: number }> {
        const where: any = {};
        if (vereadorId) where.vereadorId = vereadorId;
        const bills = await this.billsRepository.find({ where });
        return {
            total: bills.length,
            em_tramitacao: bills.filter(b => b.status === BillStatus.EM_TRAMITACAO).length,
            aprovado: bills.filter(b => b.status === BillStatus.APROVADO).length,
            rejeitado: bills.filter(b => b.status === BillStatus.REJEITADO).length,
            proprio: bills.filter(b => b.authorship === BillAuthorship.PROPRIO).length,
        };
    }
}
