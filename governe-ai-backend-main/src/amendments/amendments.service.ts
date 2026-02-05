import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Amendment } from './amendment.entity';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Injectable()
export class AmendmentsService {
  constructor(
    @InjectRepository(Amendment)
    private amendmentsRepository: Repository<Amendment>,
  ) {}

  async create(amendmentData: Partial<Amendment>, currentUser: CurrentUserData): Promise<Amendment> {
    let vereadorId: string;

    if (currentUser.role === UserRole.ADMIN) {
      // Admin DEVE especificar o vereadorId
      if (!amendmentData.vereadorId) {
        throw new BadRequestException('Admin deve especificar o vereadorId ao criar uma emenda');
      }
      vereadorId = amendmentData.vereadorId;
    } else {
      // Vereador/Assessor usa seu próprio vereadorId
      vereadorId = currentUser.vereadorId;
    }

    const amendment = this.amendmentsRepository.create({
      ...amendmentData,
      vereadorId,
    });
    return await this.amendmentsRepository.save(amendment);
  }

  async findAll(vereadorId: string | null): Promise<Amendment[]> {
    if (!vereadorId) {
      // Admin: retorna todas as emendas
      return await this.amendmentsRepository.find({
        order: { createdAt: 'DESC' },
      });
    }

    // Usuário comum: retorna apenas emendas do seu vereador
    return await this.amendmentsRepository.find({
      where: { vereadorId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, vereadorId: string | null): Promise<Amendment> {
    const amendment = await this.amendmentsRepository.findOne({ where: { id } });
    if (!amendment) {
      throw new NotFoundException('Emenda não encontrada');
    }

    // Verifica se o usuário tem acesso a este registro
    if (vereadorId && amendment.vereadorId !== vereadorId) {
      throw new ForbiddenException('Acesso negado a esta emenda');
    }

    return amendment;
  }

  async update(id: string, amendmentData: Partial<Amendment>, vereadorId: string | null): Promise<Amendment> {
    const amendment = await this.findOne(id, vereadorId);

    // Remove vereadorId do update para não permitir alteração
    const { vereadorId: _, ...dataToUpdate } = amendmentData as any;
    Object.assign(amendment, dataToUpdate);

    return await this.amendmentsRepository.save(amendment);
  }

  async remove(id: string, vereadorId: string | null): Promise<void> {
    const amendment = await this.findOne(id, vereadorId);
    await this.amendmentsRepository.remove(amendment);
  }
}
