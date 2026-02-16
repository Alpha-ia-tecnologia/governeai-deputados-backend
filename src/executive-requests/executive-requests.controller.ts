import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ExecutiveRequestsService } from './executive-requests.service';
import { ExecutiveRequest } from './executive-request.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Controller('executive-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
export class ExecutiveRequestsController {
    constructor(private readonly requestsService: ExecutiveRequestsService) { }

    @Post()
    create(@Body() requestData: Partial<ExecutiveRequest>, @CurrentUser() user: CurrentUserData) {
        return this.requestsService.create(requestData, user);
    }

    @Get()
    findAll(@CurrentUser() user: CurrentUserData) {
        return this.requestsService.findAll(user.vereadorId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
        return this.requestsService.findOne(id, user.vereadorId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() requestData: Partial<ExecutiveRequest>, @CurrentUser() user: CurrentUserData) {
        return this.requestsService.update(id, requestData, user.vereadorId);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
        return this.requestsService.remove(id, user.vereadorId);
    }
}
