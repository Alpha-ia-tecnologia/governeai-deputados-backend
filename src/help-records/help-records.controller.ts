import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { HelpRecordsService } from './help-records.service';
import { HelpRecord } from './help-record.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';
import { DataSource } from 'typeorm';

@Controller('help-records')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR) // Liderança NÃO pode gerenciar atendimentos
export class HelpRecordsController {
  constructor(
    private readonly helpRecordsService: HelpRecordsService,
    private readonly dataSource: DataSource,
  ) {}

  @Post('migrate')
  async migrate() {
    try {
      // Check if column exists first
      const result = await this.dataSource.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'help_records' AND column_name = 'serviceDate'
      `);
      
      if (result.length === 0) {
        await this.dataSource.query(`
          ALTER TABLE help_records ADD COLUMN "serviceDate" date
        `);
        return { message: 'Column serviceDate added successfully' };
      }
      
      return { message: 'Column serviceDate already exists' };
    } catch (error) {
      return { error: error.message };
    }
  }

  @Post()
  create(@Body() helpRecordData: Partial<HelpRecord>, @CurrentUser() user: CurrentUserData) {
    return this.helpRecordsService.create(helpRecordData, user);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.helpRecordsService.findAll(user.vereadorId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.helpRecordsService.findOne(id, user.vereadorId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() helpRecordData: Partial<HelpRecord>, @CurrentUser() user: CurrentUserData) {
    return this.helpRecordsService.update(id, helpRecordData, user.vereadorId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.helpRecordsService.remove(id, user.vereadorId);
  }
}
