import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { Leader } from '../leaders/leader.entity';
import { Voter } from '../voters/voter.entity';
import { Visit } from '../visits/visit.entity';
import { HelpRecord } from '../help-records/help-record.entity';
import { Appointment } from '../appointments/appointment.entity';
import { LawProject } from '../projects/project.entity';
import { Amendment } from '../amendments/amendment.entity';

@Injectable()
export class MigrationService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Leader)
    private leadersRepository: Repository<Leader>,
    @InjectRepository(Voter)
    private votersRepository: Repository<Voter>,
    @InjectRepository(Visit)
    private visitsRepository: Repository<Visit>,
    @InjectRepository(HelpRecord)
    private helpRecordsRepository: Repository<HelpRecord>,
    @InjectRepository(Appointment)
    private appointmentsRepository: Repository<Appointment>,
    @InjectRepository(LawProject)
    private projectsRepository: Repository<LawProject>,
    @InjectRepository(Amendment)
    private amendmentsRepository: Repository<Amendment>,
  ) {}

  // Lista todos os vereadores disponíveis
  async listVereadores() {
    const vereadores = await this.usersRepository.find({
      where: { role: UserRole.VEREADOR },
      select: ['id', 'name', 'email'],
    });
    return vereadores;
  }

  // Retorna estatísticas de registros sem vereadorId
  async getOrphanStats() {
    const [
      leadersCount,
      votersCount,
      visitsCount,
      helpRecordsCount,
      appointmentsCount,
      projectsCount,
      amendmentsCount,
      usersCount,
    ] = await Promise.all([
      this.leadersRepository.count({ where: { vereadorId: IsNull() } }),
      this.votersRepository.count({ where: { vereadorId: IsNull() } }),
      this.visitsRepository.count({ where: { vereadorId: IsNull() } }),
      this.helpRecordsRepository.count({ where: { vereadorId: IsNull() } }),
      this.appointmentsRepository.count({ where: { vereadorId: IsNull() } }),
      this.projectsRepository.count({ where: { vereadorId: IsNull() } }),
      this.amendmentsRepository.count({ where: { vereadorId: IsNull() } }),
      this.usersRepository.count({
        where: [
          { role: UserRole.ASSESSOR, vereadorId: IsNull() },
          { role: UserRole.LIDERANCA, vereadorId: IsNull() },
        ],
      }),
    ]);

    return {
      leaders: leadersCount,
      voters: votersCount,
      visits: visitsCount,
      helpRecords: helpRecordsCount,
      appointments: appointmentsCount,
      projects: projectsCount,
      amendments: amendmentsCount,
      users: usersCount,
      total: leadersCount + votersCount + visitsCount + helpRecordsCount + appointmentsCount + projectsCount + amendmentsCount + usersCount,
    };
  }

  // Migra todos os dados órfãos para um vereador específico
  async migrateToVereador(vereadorId: string) {
    // Verifica se o vereador existe
    const vereador = await this.usersRepository.findOne({
      where: { id: vereadorId, role: UserRole.VEREADOR },
    });

    if (!vereador) {
      throw new NotFoundException('Vereador não encontrado');
    }

    // Primeiro, atualiza o vereadorId do próprio vereador para si mesmo
    if (!vereador.vereadorId) {
      vereador.vereadorId = vereador.id;
      await this.usersRepository.save(vereador);
    }

    // Migra cada entidade
    const results = {
      leaders: 0,
      voters: 0,
      visits: 0,
      helpRecords: 0,
      appointments: 0,
      projects: 0,
      amendments: 0,
      users: 0,
    };

    // Leaders
    const leadersResult = await this.leadersRepository.update(
      { vereadorId: IsNull() },
      { vereadorId: vereadorId },
    );
    results.leaders = leadersResult.affected || 0;

    // Voters
    const votersResult = await this.votersRepository.update(
      { vereadorId: IsNull() },
      { vereadorId: vereadorId },
    );
    results.voters = votersResult.affected || 0;

    // Visits
    const visitsResult = await this.visitsRepository.update(
      { vereadorId: IsNull() },
      { vereadorId: vereadorId },
    );
    results.visits = visitsResult.affected || 0;

    // Help Records
    const helpRecordsResult = await this.helpRecordsRepository.update(
      { vereadorId: IsNull() },
      { vereadorId: vereadorId },
    );
    results.helpRecords = helpRecordsResult.affected || 0;

    // Appointments
    const appointmentsResult = await this.appointmentsRepository.update(
      { vereadorId: IsNull() },
      { vereadorId: vereadorId },
    );
    results.appointments = appointmentsResult.affected || 0;

    // Projects
    const projectsResult = await this.projectsRepository.update(
      { vereadorId: IsNull() },
      { vereadorId: vereadorId },
    );
    results.projects = projectsResult.affected || 0;

    // Amendments
    const amendmentsResult = await this.amendmentsRepository.update(
      { vereadorId: IsNull() },
      { vereadorId: vereadorId },
    );
    results.amendments = amendmentsResult.affected || 0;

    // Users (assessores e lideranças)
    const usersResult = await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({ vereadorId: vereadorId })
      .where('role IN (:...roles)', { roles: [UserRole.ASSESSOR, UserRole.LIDERANCA] })
      .andWhere('"vereadorId" IS NULL')
      .execute();
    results.users = usersResult.affected || 0;

    return {
      message: 'Migração concluída com sucesso',
      vereador: {
        id: vereador.id,
        name: vereador.name,
      },
      migrated: results,
      total: Object.values(results).reduce((a, b) => a + b, 0),
    };
  }

  // Vincula um usuário específico a um vereador
  async linkUserToVereador(userId: string, vereadorId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Administradores não podem ser vinculados a vereadores');
    }

    if (user.role === UserRole.VEREADOR) {
      // Vereador aponta para si mesmo
      user.vereadorId = user.id;
    } else {
      // Verifica se o vereador existe
      const vereador = await this.usersRepository.findOne({
        where: { id: vereadorId, role: UserRole.VEREADOR },
      });

      if (!vereador) {
        throw new NotFoundException('Vereador não encontrado');
      }

      user.vereadorId = vereadorId;
    }

    await this.usersRepository.save(user);

    return {
      message: 'Usuário vinculado com sucesso',
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        vereadorId: user.vereadorId,
      },
    };
  }
}
