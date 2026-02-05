import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AmendmentsService } from './amendments.service';
import { Amendment } from './amendment.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Controller('amendments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR) // Liderança NÃO pode acessar emendas
export class AmendmentsController {
  constructor(private readonly amendmentsService: AmendmentsService) {}

  @Post()
  create(@Body() amendmentData: Partial<Amendment>, @CurrentUser() user: CurrentUserData) {
    return this.amendmentsService.create(amendmentData, user);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.amendmentsService.findAll(user.vereadorId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.amendmentsService.findOne(id, user.vereadorId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() amendmentData: Partial<Amendment>, @CurrentUser() user: CurrentUserData) {
    return this.amendmentsService.update(id, amendmentData, user.vereadorId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.amendmentsService.remove(id, user.vereadorId);
  }
}
