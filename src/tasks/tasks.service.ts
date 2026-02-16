import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GabineteTask, TaskStatus } from './task.entity';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Injectable()
export class TasksService {
    constructor(
        @InjectRepository(GabineteTask)
        private tasksRepository: Repository<GabineteTask>,
    ) { }

    async create(data: Partial<GabineteTask>, currentUser: CurrentUserData): Promise<GabineteTask> {
        let vereadorId: string;

        if (currentUser.role === UserRole.ADMIN) {
            if (!data.vereadorId) {
                throw new BadRequestException('Admin deve especificar o vereadorId');
            }
            vereadorId = data.vereadorId;
        } else {
            vereadorId = currentUser.vereadorId;
        }

        const task = this.tasksRepository.create({
            ...data,
            vereadorId,
        });
        return await this.tasksRepository.save(task);
    }

    async findAll(vereadorId: string | null): Promise<GabineteTask[]> {
        if (!vereadorId) {
            return await this.tasksRepository.find({ order: { createdAt: 'DESC' } });
        }
        return await this.tasksRepository.find({
            where: { vereadorId },
            order: { createdAt: 'DESC' },
        });
    }

    async findByAssignee(assigneeId: string, vereadorId: string | null): Promise<GabineteTask[]> {
        const where: any = { assigneeId };
        if (vereadorId) where.vereadorId = vereadorId;
        return await this.tasksRepository.find({ where, order: { createdAt: 'DESC' } });
    }

    async findByStatus(status: TaskStatus, vereadorId: string | null): Promise<GabineteTask[]> {
        const where: any = { status };
        if (vereadorId) where.vereadorId = vereadorId;
        return await this.tasksRepository.find({ where, order: { createdAt: 'DESC' } });
    }

    async findOne(id: string, vereadorId: string | null): Promise<GabineteTask> {
        const task = await this.tasksRepository.findOne({ where: { id } });
        if (!task) {
            throw new NotFoundException('Tarefa não encontrada');
        }
        if (vereadorId && task.vereadorId !== vereadorId) {
            throw new ForbiddenException('Acesso negado');
        }
        return task;
    }

    async update(id: string, data: Partial<GabineteTask>, vereadorId: string | null): Promise<GabineteTask> {
        const task = await this.findOne(id, vereadorId);
        const { vereadorId: _, ...dataToUpdate } = data as any;

        // Auto-set completedAt when status changes to concluida
        if (dataToUpdate.status === TaskStatus.CONCLUIDA && !task.completedAt) {
            dataToUpdate.completedAt = new Date();
        }

        Object.assign(task, dataToUpdate);
        return await this.tasksRepository.save(task);
    }

    async remove(id: string, vereadorId: string | null): Promise<void> {
        const task = await this.findOne(id, vereadorId);
        await this.tasksRepository.remove(task);
    }

    async getStats(vereadorId: string | null): Promise<{ pendente: number; em_andamento: number; concluida: number; atrasada: number }> {
        const where: any = {};
        if (vereadorId) where.vereadorId = vereadorId;

        const tasks = await this.tasksRepository.find({ where });
        return {
            pendente: tasks.filter(t => t.status === TaskStatus.PENDENTE).length,
            em_andamento: tasks.filter(t => t.status === TaskStatus.EM_ANDAMENTO).length,
            concluida: tasks.filter(t => t.status === TaskStatus.CONCLUIDA).length,
            atrasada: tasks.filter(t => t.status === TaskStatus.ATRASADA).length,
        };
    }
}
