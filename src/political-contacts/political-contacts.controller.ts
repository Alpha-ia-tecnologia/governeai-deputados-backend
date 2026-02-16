import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PoliticalContactsService } from './political-contacts.service';
import { PoliticalContact, PoliticalRole } from './political-contact.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Controller('political-contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PoliticalContactsController {
    constructor(private readonly politicalContactsService: PoliticalContactsService) { }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
    create(@Body() data: Partial<PoliticalContact>, @CurrentUser() user: CurrentUserData) {
        return this.politicalContactsService.create(data, user);
    }

    @Get()
    findAll(@CurrentUser() user: CurrentUserData) {
        return this.politicalContactsService.findAll(user.vereadorId);
    }

    @Get('by-role/:role')
    findByRole(@Param('role') role: PoliticalRole, @CurrentUser() user: CurrentUserData) {
        return this.politicalContactsService.findByRole(role, user.vereadorId);
    }

    @Get('by-city/:city')
    findByCity(@Param('city') city: string, @CurrentUser() user: CurrentUserData) {
        return this.politicalContactsService.findByCity(city, user.vereadorId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
        return this.politicalContactsService.findOne(id, user.vereadorId);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
    update(@Param('id') id: string, @Body() data: Partial<PoliticalContact>, @CurrentUser() user: CurrentUserData) {
        return this.politicalContactsService.update(id, data, user.vereadorId);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
    remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
        return this.politicalContactsService.remove(id, user.vereadorId);
    }
}
