import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VotingRecord, VoteChoice } from './voting-record.entity';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Injectable()
export class VotingRecordsService {
    constructor(
        @InjectRepository(VotingRecord)
        private votingRecordsRepository: Repository<VotingRecord>,
    ) { }

    async create(data: Partial<VotingRecord>, currentUser: CurrentUserData): Promise<VotingRecord> {
        let vereadorId: string;
        if (currentUser.role === UserRole.ADMIN) {
            if (!data.vereadorId) throw new BadRequestException('Admin deve especificar o vereadorId');
            vereadorId = data.vereadorId;
        } else {
            vereadorId = currentUser.vereadorId;
        }
        const record = this.votingRecordsRepository.create({ ...data, vereadorId });
        return await this.votingRecordsRepository.save(record);
    }

    async findAll(vereadorId: string | null): Promise<VotingRecord[]> {
        if (!vereadorId) {
            return await this.votingRecordsRepository.find({ order: { date: 'DESC' } });
        }
        return await this.votingRecordsRepository.find({ where: { vereadorId }, order: { date: 'DESC' } });
    }

    async findOne(id: string, vereadorId: string | null): Promise<VotingRecord> {
        const record = await this.votingRecordsRepository.findOne({ where: { id } });
        if (!record) throw new NotFoundException('Registro de votação não encontrado');
        if (vereadorId && record.vereadorId !== vereadorId) throw new ForbiddenException('Acesso negado');
        return record;
    }

    async update(id: string, data: Partial<VotingRecord>, vereadorId: string | null): Promise<VotingRecord> {
        const record = await this.findOne(id, vereadorId);
        const { vereadorId: _, ...dataToUpdate } = data as any;
        Object.assign(record, dataToUpdate);
        return await this.votingRecordsRepository.save(record);
    }

    async remove(id: string, vereadorId: string | null): Promise<void> {
        const record = await this.findOne(id, vereadorId);
        await this.votingRecordsRepository.remove(record);
    }

    async getPresenceRate(vereadorId: string | null): Promise<{ total: number; present: number; absent: number; rate: number }> {
        const where: any = {};
        if (vereadorId) where.vereadorId = vereadorId;
        const records = await this.votingRecordsRepository.find({ where });
        const absent = records.filter(v => v.vote === VoteChoice.AUSENTE).length;
        const present = records.length - absent;
        return {
            total: records.length,
            present,
            absent,
            rate: records.length > 0 ? Math.round((present / records.length) * 100) : 0,
        };
    }
}
