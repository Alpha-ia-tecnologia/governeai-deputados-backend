import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { CeapService } from './ceap.service';
import { CeapExpense, ExpenseCategory } from './ceap-expense.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Controller('ceap')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CeapController {
    constructor(private readonly ceapService: CeapService) { }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
    create(@Body() data: Partial<CeapExpense>, @CurrentUser() user: CurrentUserData) {
        return this.ceapService.create(data, user);
    }

    @Get()
    findAll(@CurrentUser() user: CurrentUserData) {
        return this.ceapService.findAll(user.vereadorId);
    }

    @Get('summary')
    getSummary(@CurrentUser() user: CurrentUserData) {
        return this.ceapService.getSummary(user.vereadorId);
    }

    @Get('by-category/:category')
    findByCategory(@Param('category') category: ExpenseCategory, @CurrentUser() user: CurrentUserData) {
        return this.ceapService.findByCategory(category, user.vereadorId);
    }

    @Get('by-month')
    findByMonth(@Query('year') year: number, @Query('month') month: number, @CurrentUser() user: CurrentUserData) {
        return this.ceapService.findByMonth(year, month, user.vereadorId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
        return this.ceapService.findOne(id, user.vereadorId);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
    update(@Param('id') id: string, @Body() data: Partial<CeapExpense>, @CurrentUser() user: CurrentUserData) {
        return this.ceapService.update(id, data, user.vereadorId);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
    remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
        return this.ceapService.remove(id, user.vereadorId);
    }
}
