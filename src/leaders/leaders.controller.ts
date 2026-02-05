import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { LeadersService } from './leaders.service';
import { Leader } from './leader.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Controller('leaders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadersController {
  constructor(private readonly leadersService: LeadersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR) // Liderança NÃO pode criar lideranças
  create(@Body() leaderData: Partial<Leader>, @CurrentUser() user: CurrentUserData) {
    return this.leadersService.create(leaderData, user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR, UserRole.LIDERANCA) // Todos podem visualizar
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.leadersService.findAll(user.vereadorId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR, UserRole.LIDERANCA) // Todos podem visualizar
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.leadersService.findOne(id, user.vereadorId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR) // Liderança NÃO pode editar
  update(@Param('id') id: string, @Body() leaderData: Partial<Leader>, @CurrentUser() user: CurrentUserData) {
    return this.leadersService.update(id, leaderData, user.vereadorId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR) // Liderança NÃO pode excluir
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.leadersService.remove(id, user.vereadorId);
  }

  @Post('from-user/:userId')
  @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR, UserRole.LIDERANCA)
  createFromUser(
    @Param('userId') userId: string,
    @Body() userData: { name: string; cpf?: string; phone: string; email?: string; region?: string },
    @CurrentUser() user: CurrentUserData
  ) {
    return this.leadersService.findOrCreateByUserId(userId, {
      ...userData,
      vereadorId: user.vereadorId,
    });
  }
}
