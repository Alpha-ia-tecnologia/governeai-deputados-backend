import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { VotingRecordsService } from './voting-records.service';
import { VotingRecord } from './voting-record.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Controller('voting-records')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VotingRecordsController {
    constructor(private readonly votingRecordsService: VotingRecordsService) { }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
    create(@Body() data: Partial<VotingRecord>, @CurrentUser() user: CurrentUserData) {
        return this.votingRecordsService.create(data, user);
    }

    @Get()
    findAll(@CurrentUser() user: CurrentUserData) {
        return this.votingRecordsService.findAll(user.vereadorId);
    }

    @Get('presence-rate')
    getPresenceRate(@CurrentUser() user: CurrentUserData) {
        return this.votingRecordsService.getPresenceRate(user.vereadorId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
        return this.votingRecordsService.findOne(id, user.vereadorId);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
    update(@Param('id') id: string, @Body() data: Partial<VotingRecord>, @CurrentUser() user: CurrentUserData) {
        return this.votingRecordsService.update(id, data, user.vereadorId);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
    remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
        return this.votingRecordsService.remove(id, user.vereadorId);
    }
}
