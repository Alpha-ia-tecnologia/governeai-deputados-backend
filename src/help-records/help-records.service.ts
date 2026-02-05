import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HelpRecord } from './help-record.entity';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Injectable()
export class HelpRecordsService {
  constructor(
    @InjectRepository(HelpRecord)
    private helpRecordsRepository: Repository<HelpRecord>,
  ) {}

  async create(helpRecordData: Partial<HelpRecord>, currentUser: CurrentUserData): Promise<any> {
    let vereadorId: string;

    if (currentUser.role === UserRole.ADMIN) {
      // Admin DEVE especificar o vereadorId
      if (!helpRecordData.vereadorId) {
        throw new BadRequestException('Admin deve especificar o vereadorId ao criar um atendimento');
      }
      vereadorId = helpRecordData.vereadorId;
    } else {
      // Vereador/Assessor usa seu próprio vereadorId
      vereadorId = currentUser.vereadorId;
    }

    const helpRecord = this.helpRecordsRepository.create({
      ...helpRecordData,
      vereadorId,
    });
    const saved = await this.helpRecordsRepository.save(helpRecord);
    return this.formatHelpRecord(saved);
  }

  async findAll(vereadorId: string | null): Promise<any[]> {
    try {
      const whereCondition = vereadorId ? { vereadorId } : {};

      const helpRecords = await this.helpRecordsRepository.find({
        where: whereCondition,
        relations: ['voter', 'leader', 'responsible'],
        order: { createdAt: 'DESC' },
      });
      return helpRecords.map(hr => this.formatHelpRecord(hr));
    } catch (error) {
      console.error('Error fetching help records:', error);
      return [];
    }
  }

  async findOne(id: string, vereadorId: string | null): Promise<any> {
    const helpRecord = await this.helpRecordsRepository.findOne({
      where: { id },
      relations: ['voter', 'leader', 'responsible'],
    });

    if (!helpRecord) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    // Verifica se o usuário tem acesso a este registro
    if (vereadorId && helpRecord.vereadorId !== vereadorId) {
      throw new ForbiddenException('Acesso negado a este atendimento');
    }

    return this.formatHelpRecord(helpRecord);
  }

  async update(id: string, helpRecordData: Partial<HelpRecord>, vereadorId: string | null): Promise<any> {
    const helpRecord = await this.helpRecordsRepository.findOne({ where: { id } });

    if (!helpRecord) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    // Verifica se o usuário tem acesso a este registro
    if (vereadorId && helpRecord.vereadorId !== vereadorId) {
      throw new ForbiddenException('Acesso negado a este atendimento');
    }

    // Remove vereadorId do update para não permitir alteração
    const { vereadorId: _, ...dataToUpdate } = helpRecordData as any;
    Object.assign(helpRecord, dataToUpdate);
    const updated = await this.helpRecordsRepository.save(helpRecord);

    return this.findOne(updated.id, vereadorId);
  }

  async remove(id: string, vereadorId: string | null): Promise<void> {
    const helpRecord = await this.helpRecordsRepository.findOne({ where: { id } });

    if (!helpRecord) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    // Verifica se o usuário tem acesso a este registro
    if (vereadorId && helpRecord.vereadorId !== vereadorId) {
      throw new ForbiddenException('Acesso negado a este atendimento');
    }

    await this.helpRecordsRepository.remove(helpRecord);
  }

  private formatHelpRecord(hr: HelpRecord): any {
    return {
      ...hr,
      voterName: hr.voter?.name || '',
      leaderName: hr.leader?.name || '',
      responsibleName: hr.responsible?.name || '',
    };
  }
}
