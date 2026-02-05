import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { VisitsService } from './visits.service';
import { Visit } from './visit.entity';
import { CreateVisitDto } from './dto/create-visit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';

@Controller('visits')
@UseGuards(JwtAuthGuard)
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post()
  create(@Body() visitData: CreateVisitDto, @CurrentUser() user: CurrentUserData) {
    return this.visitsService.create(visitData, user);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.visitsService.findAll(user.vereadorId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.visitsService.findOne(id, user.vereadorId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() visitData: Partial<Visit>, @CurrentUser() user: CurrentUserData) {
    return this.visitsService.update(id, visitData, user.vereadorId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.visitsService.remove(id, user.vereadorId);
  }
}
