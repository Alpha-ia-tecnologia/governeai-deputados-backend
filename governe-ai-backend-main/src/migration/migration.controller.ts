import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { MigrationService } from './migration.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('migration')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN) // Apenas admin pode executar migrações
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  // GET /migration/vereadores - Lista vereadores disponíveis
  @Get('vereadores')
  listVereadores() {
    return this.migrationService.listVereadores();
  }

  // GET /migration/stats - Estatísticas de registros sem vereadorId
  @Get('stats')
  getOrphanStats() {
    return this.migrationService.getOrphanStats();
  }

  // POST /migration/migrate/:vereadorId - Migra dados para um vereador
  @Post('migrate/:vereadorId')
  migrateToVereador(@Param('vereadorId') vereadorId: string) {
    return this.migrationService.migrateToVereador(vereadorId);
  }

  // POST /migration/link-user/:userId/:vereadorId - Vincula usuário a vereador
  @Post('link-user/:userId/:vereadorId')
  linkUserToVereador(
    @Param('userId') userId: string,
    @Param('vereadorId') vereadorId: string,
  ) {
    return this.migrationService.linkUserToVereador(userId, vereadorId);
  }
}
