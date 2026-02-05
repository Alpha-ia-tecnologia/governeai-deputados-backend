import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { Appointment } from './appointment.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR) // Liderança NÃO pode criar agendas
  create(@Body() appointmentData: Partial<Appointment>, @CurrentUser() user: CurrentUserData) {
    // Remove campos que não fazem parte da entidade
    const { voterName, leaderName, responsibleName, ...cleanData } = appointmentData as any;
    return this.appointmentsService.create(cleanData, user);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.appointmentsService.findAll(user.vereadorId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.appointmentsService.findOne(id, user.vereadorId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR) // Liderança NÃO pode editar agendas
  update(@Param('id') id: string, @Body() appointmentData: Partial<Appointment>, @CurrentUser() user: CurrentUserData) {
    return this.appointmentsService.update(id, appointmentData, user.vereadorId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR) // Liderança NÃO pode deletar agendas
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.appointmentsService.remove(id, user.vereadorId);
  }
}
