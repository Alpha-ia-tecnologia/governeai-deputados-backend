import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './audit-log.entity';

@Injectable()
export class AuditLogService {
    constructor(
        @InjectRepository(AuditLog)
        private auditLogRepository: Repository<AuditLog>,
    ) { }

    async log(
        action: AuditAction,
        entity: string,
        description: string,
        userId?: string,
        userName?: string,
        vereadorId?: string,
        entityId?: string,
        details?: Record<string, any>,
    ): Promise<void> {
        const entry = this.auditLogRepository.create({
            action,
            entity,
            description,
            userId,
            userName,
            vereadorId,
            entityId,
            details,
        });
        await this.auditLogRepository.save(entry);
    }

    async findAll(vereadorId: string | null, limit = 100): Promise<AuditLog[]> {
        if (!vereadorId) {
            return await this.auditLogRepository.find({
                order: { timestamp: 'DESC' },
                take: limit,
            });
        }
        return await this.auditLogRepository.find({
            where: { vereadorId },
            order: { timestamp: 'DESC' },
            take: limit,
        });
    }

    async findByEntity(entity: string, vereadorId: string | null): Promise<AuditLog[]> {
        const where: any = { entity };
        if (vereadorId) where.vereadorId = vereadorId;
        return await this.auditLogRepository.find({
            where,
            order: { timestamp: 'DESC' },
            take: 100,
        });
    }

    async findByAction(action: AuditAction, vereadorId: string | null): Promise<AuditLog[]> {
        const where: any = { action };
        if (vereadorId) where.vereadorId = vereadorId;
        return await this.auditLogRepository.find({
            where,
            order: { timestamp: 'DESC' },
            take: 100,
        });
    }

    async clear(vereadorId: string | null): Promise<void> {
        if (!vereadorId) {
            await this.auditLogRepository.clear();
        } else {
            await this.auditLogRepository.delete({ vereadorId });
        }
    }
}
