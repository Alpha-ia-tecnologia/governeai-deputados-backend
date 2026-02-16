import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExecutiveRequest } from './executive-request.entity';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Injectable()
export class ExecutiveRequestsService {
    constructor(
        @InjectRepository(ExecutiveRequest)
        private requestsRepository: Repository<ExecutiveRequest>,
    ) { }

    async create(requestData: Partial<ExecutiveRequest>, currentUser: CurrentUserData): Promise<ExecutiveRequest> {
        let vereadorId: string;

        if (currentUser.role === UserRole.ADMIN) {
            if (!requestData.vereadorId) {
                throw new BadRequestException('Admin deve especificar o vereadorId ao criar um requerimento');
            }
            vereadorId = requestData.vereadorId;
        } else {
            vereadorId = currentUser.vereadorId;
        }

        const request = this.requestsRepository.create({
            ...requestData,
            vereadorId,
        });
        return await this.requestsRepository.save(request);
    }

    async findAll(vereadorId: string | null): Promise<ExecutiveRequest[]> {
        if (!vereadorId) {
            return await this.requestsRepository.find({
                order: { createdAt: 'DESC' },
            });
        }

        return await this.requestsRepository.find({
            where: { vereadorId },
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string, vereadorId: string | null): Promise<ExecutiveRequest> {
        const request = await this.requestsRepository.findOne({ where: { id } });
        if (!request) {
            throw new NotFoundException('Requerimento não encontrado');
        }

        if (vereadorId && request.vereadorId !== vereadorId) {
            throw new ForbiddenException('Acesso negado a este requerimento');
        }

        return request;
    }

    async update(id: string, requestData: Partial<ExecutiveRequest>, vereadorId: string | null): Promise<ExecutiveRequest> {
        const request = await this.findOne(id, vereadorId);

        const { vereadorId: _, ...dataToUpdate } = requestData as any;
        Object.assign(request, dataToUpdate);

        return await this.requestsRepository.save(request);
    }

    async remove(id: string, vereadorId: string | null): Promise<void> {
        const request = await this.findOne(id, vereadorId);
        await this.requestsRepository.remove(request);
    }
}
