import {
    Controller,
    Get,
    Patch,
    Post,
    Body,
    Request,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import {
    WhatsappSettingsService,
    UpdateSettingsDto,
} from '../services/whatsapp-settings.service';

@Controller('whatsapp/settings')
@UseGuards(JwtAuthGuard)
export class WhatsappSettingsController {

    constructor(private readonly settingsService: WhatsappSettingsService) { }

    @Get()
    async getSettings(@Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.userId;
        return this.settingsService.getSettings(vereadorId);
    }

    @Patch()
    async updateSettings(@Body() dto: UpdateSettingsDto, @Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.userId;
        return this.settingsService.updateSettings(vereadorId, dto);
    }

    @Post('test-connection')
    async testConnection(@Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.userId;
        return this.settingsService.testConnection(vereadorId);
    }
}
