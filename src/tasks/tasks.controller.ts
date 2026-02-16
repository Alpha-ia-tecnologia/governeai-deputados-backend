import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { GabineteTask, TaskStatus } from './task.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
    create(@Body() data: Partial<GabineteTask>, @CurrentUser() user: CurrentUserData) {
        return this.tasksService.create(data, user);
    }

    @Get()
    findAll(@CurrentUser() user: CurrentUserData) {
        return this.tasksService.findAll(user.vereadorId);
    }

    @Get('stats')
    getStats(@CurrentUser() user: CurrentUserData) {
        return this.tasksService.getStats(user.vereadorId);
    }

    @Get('by-assignee/:assigneeId')
    findByAssignee(@Param('assigneeId') assigneeId: string, @CurrentUser() user: CurrentUserData) {
        return this.tasksService.findByAssignee(assigneeId, user.vereadorId);
    }

    @Get('by-status/:status')
    findByStatus(@Param('status') status: TaskStatus, @CurrentUser() user: CurrentUserData) {
        return this.tasksService.findByStatus(status, user.vereadorId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
        return this.tasksService.findOne(id, user.vereadorId);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
    update(@Param('id') id: string, @Body() data: Partial<GabineteTask>, @CurrentUser() user: CurrentUserData) {
        return this.tasksService.update(id, data, user.vereadorId);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.VEREADOR, UserRole.ASSESSOR)
    remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
        return this.tasksService.remove(id, user.vereadorId);
    }
}
