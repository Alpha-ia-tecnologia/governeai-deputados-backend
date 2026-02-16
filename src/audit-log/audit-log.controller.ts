import { Controller, Get, Post, Delete, Param, UseGuards, Query } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditAction } from './audit-log.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@Controller('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogController {
    constructor(private readonly auditLogService: AuditLogService) { }

    @Get()
    findAll(@CurrentUser() user: CurrentUserData, @Query('limit') limit?: number) {
        return this.auditLogService.findAll(user.vereadorId, limit || 100);
    }

    @Get('by-entity/:entity')
    findByEntity(@Param('entity') entity: string, @CurrentUser() user: CurrentUserData) {
        return this.auditLogService.findByEntity(entity, user.vereadorId);
    }

    @Get('by-action/:action')
    findByAction(@Param('action') action: AuditAction, @CurrentUser() user: CurrentUserData) {
        return this.auditLogService.findByAction(action, user.vereadorId);
    }

    @Delete()
    @Roles(UserRole.ADMIN, UserRole.VEREADOR)
    clear(@CurrentUser() user: CurrentUserData) {
        return this.auditLogService.clear(user.vereadorId);
    }
}
