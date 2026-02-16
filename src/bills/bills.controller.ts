import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { BillsService } from './bills.service';
import { LegislativeBill, BillStatus, BillAuthorship } from './bill.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Controller('bills')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillsController {
    constructor(private readonly billsService: BillsService) { }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
    create(@Body() data: Partial<LegislativeBill>, @CurrentUser() user: CurrentUserData) {
        return this.billsService.create(data, user);
    }

    @Get()
    findAll(@CurrentUser() user: CurrentUserData) {
        return this.billsService.findAll(user.vereadorId);
    }

    @Get('stats')
    getStats(@CurrentUser() user: CurrentUserData) {
        return this.billsService.getStats(user.vereadorId);
    }

    @Get('by-authorship/:authorship')
    findByAuthorship(@Param('authorship') authorship: BillAuthorship, @CurrentUser() user: CurrentUserData) {
        return this.billsService.findByAuthorship(authorship, user.vereadorId);
    }

    @Get('by-status/:status')
    findByStatus(@Param('status') status: BillStatus, @CurrentUser() user: CurrentUserData) {
        return this.billsService.findByStatus(status, user.vereadorId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
        return this.billsService.findOne(id, user.vereadorId);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
    update(@Param('id') id: string, @Body() data: Partial<LegislativeBill>, @CurrentUser() user: CurrentUserData) {
        return this.billsService.update(id, data, user.vereadorId);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
    remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
        return this.billsService.remove(id, user.vereadorId);
    }
}
