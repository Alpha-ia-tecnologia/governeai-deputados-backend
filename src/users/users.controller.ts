import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Endpoints de verificação de campos únicos
  @Get('check/email/:email')
  @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
  async checkEmail(@Param('email') email: string) {
    const exists = await this.usersService.checkEmailExists(email);
    return { exists };
  }

  @Get('check/cpf/:cpf')
  @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
  async checkCpf(@Param('cpf') cpf: string) {
    const exists = await this.usersService.checkCpfExists(cpf);
    return { exists };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
  create(@Body() userData: Partial<User>, @CurrentUser() currentUser: CurrentUserData) {
    return this.usersService.create(userData, currentUser);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
  findAll(@CurrentUser() currentUser: CurrentUserData) {
    return this.usersService.findAll(currentUser);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() currentUser: CurrentUserData) {
    return this.usersService.findOne(id, currentUser);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
  update(@Param('id') id: string, @Body() userData: Partial<User>, @CurrentUser() currentUser: CurrentUserData) {
    return this.usersService.update(id, userData, currentUser);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
  remove(@Param('id') id: string, @CurrentUser() currentUser: CurrentUserData) {
    return this.usersService.remove(id, currentUser);
  }
}
