import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { City } from './city.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Controller('cities')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
export class CitiesController {
    constructor(private readonly citiesService: CitiesService) { }

    @Post()
    create(@Body() cityData: Partial<City>, @CurrentUser() user: CurrentUserData) {
        return this.citiesService.create(cityData, user);
    }

    @Get()
    findAll(@CurrentUser() user: CurrentUserData) {
        return this.citiesService.findAll(user.vereadorId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
        return this.citiesService.findOne(id, user.vereadorId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() cityData: Partial<City>, @CurrentUser() user: CurrentUserData) {
        return this.citiesService.update(id, cityData, user.vereadorId);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
        return this.citiesService.remove(id, user.vereadorId);
    }
}
