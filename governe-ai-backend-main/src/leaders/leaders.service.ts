import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Leader } from './leader.entity';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Injectable()
export class LeadersService {
  constructor(
    @InjectRepository(Leader)
    private leadersRepository: Repository<Leader>,
  ) {}

  async create(leaderData: Partial<Leader>, currentUser: CurrentUserData): Promise<Leader> {
    let vereadorId: string;

    if (currentUser.role === UserRole.ADMIN) {
      // Admin DEVE especificar o vereadorId
      if (!leaderData.vereadorId) {
        throw new BadRequestException('Admin deve especificar o vereadorId ao criar uma liderança');
      }
      vereadorId = leaderData.vereadorId;
    } else {
      // Vereador/Assessor usa seu próprio vereadorId
      vereadorId = currentUser.vereadorId;
    }

    const leader = this.leadersRepository.create({
      ...leaderData,
      vereadorId,
    });
    return await this.leadersRepository.save(leader);
  }

  async findAll(vereadorId: string | null): Promise<Leader[]> {
    console.log('[LeadersService] findAll called with vereadorId:', vereadorId);

    // Se vereadorId é null (ADMIN), retorna todos
    if (!vereadorId) {
      const leaders = await this.leadersRepository.find({
        order: { createdAt: 'DESC' },
      });
      console.log('[LeadersService] All leaders (admin):', leaders.length);
      return leaders;
    }

    // Filtra pelo vereador do usuário
    const leaders = await this.leadersRepository.find({
      where: { vereadorId },
      order: { createdAt: 'DESC' },
    });
    console.log('[LeadersService] Leaders for vereadorId', vereadorId, ':', leaders.length);
    return leaders;
  }

  async findOne(id: string, vereadorId: string | null): Promise<Leader> {
    const leader = await this.leadersRepository.findOne({ where: { id } });
    if (!leader) {
      throw new NotFoundException('Liderança não encontrada');
    }

    // Verifica se o usuário tem acesso a este registro
    if (vereadorId && leader.vereadorId !== vereadorId) {
      throw new ForbiddenException('Acesso negado a esta liderança');
    }

    return leader;
  }

  async update(id: string, leaderData: Partial<Leader>, vereadorId: string | null): Promise<Leader> {
    const leader = await this.findOne(id, vereadorId);
    // Remove vereadorId do update para não permitir alteração
    const { vereadorId: _, ...dataToUpdate } = leaderData as any;
    Object.assign(leader, dataToUpdate);
    return await this.leadersRepository.save(leader);
  }

  async remove(id: string, vereadorId: string | null): Promise<void> {
    const leader = await this.findOne(id, vereadorId);
    await this.leadersRepository.remove(leader);
  }

  /**
   * Busca ou cria um Leader a partir de um userId
   * Usado quando um usuário com role liderança não tem registro na tabela leaders
   */
  async findOrCreateByUserId(userId: string, userData: { name: string; cpf?: string; phone: string; email?: string; region?: string; vereadorId: string }): Promise<Leader> {
    // Primeiro tenta encontrar um leader existente com este userId
    let leader = await this.leadersRepository.findOne({
      where: { userId }
    });

    if (leader) {
      console.log('[LeadersService] Leader found by userId:', leader.id);
      return leader;
    }

    // Se não encontrou, cria um novo
    console.log('[LeadersService] Creating new leader for userId:', userId);
    leader = this.leadersRepository.create({
      name: userData.name,
      cpf: userData.cpf,
      phone: userData.phone,
      email: userData.email,
      region: userData.region || 'Não definida',
      votersCount: 0,
      votersGoal: 100,
      active: true,
      vereadorId: userData.vereadorId,
      userId: userId,
    });

    return await this.leadersRepository.save(leader);
  }
}
