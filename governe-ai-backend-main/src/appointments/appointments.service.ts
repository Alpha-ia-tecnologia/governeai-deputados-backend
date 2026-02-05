import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './appointment.entity';
import { CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentsRepository: Repository<Appointment>,
  ) {}

  async create(appointmentData: Partial<Appointment>, currentUser: CurrentUserData): Promise<any> {
    try {
      // Validar campos obrigatórios
      if (!appointmentData.title) {
        throw new BadRequestException('Título é obrigatório');
      }
      if (!appointmentData.date) {
        throw new BadRequestException('Data é obrigatória');
      }
      if (!appointmentData.time) {
        throw new BadRequestException('Hora é obrigatória');
      }
      if (!appointmentData.responsibleId) {
        throw new BadRequestException('ID do responsável é obrigatório');
      }

      let vereadorId: string;

      if (currentUser.role === UserRole.ADMIN) {
        // Admin DEVE especificar o vereadorId
        if (!appointmentData.vereadorId) {
          throw new BadRequestException('Admin deve especificar o vereadorId ao criar um compromisso');
        }
        vereadorId = appointmentData.vereadorId;
      } else {
        // Vereador/Assessor usa seu próprio vereadorId
        vereadorId = currentUser.vereadorId;
      }

      const appointment = this.appointmentsRepository.create({
        ...appointmentData,
        vereadorId,
      });
      const saved = await this.appointmentsRepository.save(appointment);
      return this.findOne(saved.id, vereadorId);
    } catch (error) {
      // Handle foreign key constraint errors
      if (error.code === '23503') {
        if (error.detail?.includes('voterId')) {
          throw new BadRequestException('Eleitor não encontrado. Por favor, atualize a lista de eleitores e tente novamente.');
        }
        if (error.detail?.includes('leaderId')) {
          throw new BadRequestException('Liderança não encontrada. Por favor, atualize a lista de lideranças e tente novamente.');
        }
        if (error.detail?.includes('responsibleId')) {
          throw new BadRequestException('Responsável não encontrado. Por favor, verifique o usuário e tente novamente.');
        }
        throw new BadRequestException('Referência inválida no compromisso. Verifique se todos os dados estão corretos.');
      }
      // Handle not-null constraint errors
      if (error.code === '23502') {
        const column = error.column || 'unknown';
        throw new BadRequestException(`Campo obrigatório não fornecido: ${column}`);
      }
      // Re-throw other errors
      throw error;
    }
  }

  async findAll(vereadorId: string | null): Promise<any[]> {
    const whereCondition = vereadorId ? { vereadorId } : {};

    const appointments = await this.appointmentsRepository.find({
      where: whereCondition,
      relations: ['voter', 'leader', 'responsible'],
      order: { date: 'DESC', time: 'ASC' },
    });

    return appointments.map(a => this.formatAppointment(a));
  }

  async findOne(id: string, vereadorId: string | null): Promise<any> {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id },
      relations: ['voter', 'leader', 'responsible'],
    });

    if (!appointment) {
      throw new NotFoundException('Compromisso não encontrado');
    }

    // Verifica se o usuário tem acesso a este registro
    if (vereadorId && appointment.vereadorId !== vereadorId) {
      throw new ForbiddenException('Acesso negado a este compromisso');
    }

    return this.formatAppointment(appointment);
  }

  async update(id: string, appointmentData: Partial<Appointment>, vereadorId: string | null): Promise<any> {
    const appointment = await this.appointmentsRepository.findOne({ where: { id } });

    if (!appointment) {
      throw new NotFoundException('Compromisso não encontrado');
    }

    // Verifica se o usuário tem acesso a este registro
    if (vereadorId && appointment.vereadorId !== vereadorId) {
      throw new ForbiddenException('Acesso negado a este compromisso');
    }

    // Remove vereadorId do update para não permitir alteração
    const { vereadorId: _, ...dataToUpdate } = appointmentData as any;
    Object.assign(appointment, dataToUpdate);
    await this.appointmentsRepository.save(appointment);

    return this.findOne(id, vereadorId);
  }

  async remove(id: string, vereadorId: string | null): Promise<void> {
    const appointment = await this.appointmentsRepository.findOne({ where: { id } });

    if (!appointment) {
      throw new NotFoundException('Compromisso não encontrado');
    }

    // Verifica se o usuário tem acesso a este registro
    if (vereadorId && appointment.vereadorId !== vereadorId) {
      throw new ForbiddenException('Acesso negado a este compromisso');
    }

    await this.appointmentsRepository.remove(appointment);
  }

  private formatAppointment(appointment: Appointment): any {
    return {
      ...appointment,
      voterName: appointment.voter?.name,
      leaderName: appointment.leader?.name,
      responsibleName: appointment.responsible?.name || '',
    };
  }
}
