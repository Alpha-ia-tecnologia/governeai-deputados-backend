import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { StaffService } from './staff.service';
import { StaffMember } from './staff.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
    constructor(private readonly staffService: StaffService) { }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
    create(@Body() data: Partial<StaffMember>, @CurrentUser() user: CurrentUserData) {
        return this.staffService.create(data, user);
    }

    @Get()
    findAll(@CurrentUser() user: CurrentUserData) {
        return this.staffService.findAll(user.vereadorId);
    }

    @Get('active-count')
    getActiveCount(@CurrentUser() user: CurrentUserData) {
        return this.staffService.getActiveCount(user.vereadorId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
        return this.staffService.findOne(id, user.vereadorId);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
    update(@Param('id') id: string, @Body() data: Partial<StaffMember>, @CurrentUser() user: CurrentUserData) {
        return this.staffService.update(id, data, user.vereadorId);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
    remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
        return this.staffService.remove(id, user.vereadorId);
    }
}
