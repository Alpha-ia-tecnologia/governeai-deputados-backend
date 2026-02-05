import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { LawProject } from './project.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR) // Liderança NÃO pode criar projetos
  create(@Body() projectData: Partial<LawProject>, @CurrentUser() user: CurrentUserData) {
    return this.projectsService.create(projectData, user);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.projectsService.findAll(user.vereadorId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.projectsService.findOne(id, user.vereadorId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR) // Liderança NÃO pode editar projetos
  update(@Param('id') id: string, @Body() projectData: Partial<LawProject>, @CurrentUser() user: CurrentUserData) {
    return this.projectsService.update(id, projectData, user.vereadorId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR) // Liderança NÃO pode deletar projetos
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.projectsService.remove(id, user.vereadorId);
  }

  @Post(':id/view')
  incrementViews(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.projectsService.incrementViews(id, user.vereadorId);
  }
}
