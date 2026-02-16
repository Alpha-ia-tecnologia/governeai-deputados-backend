import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CeapExpense, ExpenseCategory } from './ceap-expense.entity';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

const DEFAULT_MONTHLY_QUOTA = 45612.53;

@Injectable()
export class CeapService {
    constructor(
        @InjectRepository(CeapExpense)
        private ceapRepository: Repository<CeapExpense>,
    ) { }

    async create(data: Partial<CeapExpense>, currentUser: CurrentUserData): Promise<CeapExpense> {
        let vereadorId: string;
        if (currentUser.role === UserRole.ADMIN) {
            if (!data.vereadorId) throw new BadRequestException('Admin deve especificar o vereadorId');
            vereadorId = data.vereadorId;
        } else {
            vereadorId = currentUser.vereadorId;
        }
        const expense = this.ceapRepository.create({ ...data, vereadorId });
        return await this.ceapRepository.save(expense);
    }

    async findAll(vereadorId: string | null): Promise<CeapExpense[]> {
        if (!vereadorId) {
            return await this.ceapRepository.find({ order: { date: 'DESC' } });
        }
        return await this.ceapRepository.find({ where: { vereadorId }, order: { date: 'DESC' } });
    }

    async findByCategory(category: ExpenseCategory, vereadorId: string | null): Promise<CeapExpense[]> {
        const where: any = { category };
        if (vereadorId) where.vereadorId = vereadorId;
        return await this.ceapRepository.find({ where, order: { date: 'DESC' } });
    }

    async findByMonth(year: number, month: number, vereadorId: string | null): Promise<CeapExpense[]> {
        const queryBuilder = this.ceapRepository.createQueryBuilder('expense')
            .where('EXTRACT(YEAR FROM expense.date) = :year', { year })
            .andWhere('EXTRACT(MONTH FROM expense.date) = :month', { month });

        if (vereadorId) {
            queryBuilder.andWhere('expense.vereadorId = :vereadorId', { vereadorId });
        }

        return await queryBuilder.orderBy('expense.date', 'DESC').getMany();
    }

    async findOne(id: string, vereadorId: string | null): Promise<CeapExpense> {
        const expense = await this.ceapRepository.findOne({ where: { id } });
        if (!expense) throw new NotFoundException('Despesa não encontrada');
        if (vereadorId && expense.vereadorId !== vereadorId) throw new ForbiddenException('Acesso negado');
        return expense;
    }

    async update(id: string, data: Partial<CeapExpense>, vereadorId: string | null): Promise<CeapExpense> {
        const expense = await this.findOne(id, vereadorId);
        const { vereadorId: _, ...dataToUpdate } = data as any;
        Object.assign(expense, dataToUpdate);
        return await this.ceapRepository.save(expense);
    }

    async remove(id: string, vereadorId: string | null): Promise<void> {
        const expense = await this.findOne(id, vereadorId);
        await this.ceapRepository.remove(expense);
    }

    async getSummary(vereadorId: string | null): Promise<{
        totalSpent: number;
        monthlyQuota: number;
        remainingBalance: number;
        byCategory: Record<string, number>;
        byMonth: Record<string, number>;
    }> {
        const where: any = {};
        if (vereadorId) where.vereadorId = vereadorId;
        const expenses = await this.ceapRepository.find({ where });

        const totalSpent = expenses.reduce((sum, e) => sum + Number(e.value), 0);

        const byCategory: Record<string, number> = {};
        const byMonth: Record<string, number> = {};

        expenses.forEach(e => {
            byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.value);
            const dateObj = new Date(e.date);
            const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
            byMonth[monthKey] = (byMonth[monthKey] || 0) + Number(e.value);
        });

        const months = Object.keys(byMonth).length || 1;
        const totalQuota = DEFAULT_MONTHLY_QUOTA * months;

        return {
            totalSpent,
            monthlyQuota: DEFAULT_MONTHLY_QUOTA,
            remainingBalance: totalQuota - totalSpent,
            byCategory,
            byMonth,
        };
    }
}
