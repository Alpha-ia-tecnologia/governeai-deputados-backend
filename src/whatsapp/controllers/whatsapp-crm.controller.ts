import {
    Controller,
    Get,
    Patch,
    Param,
    Body,
    Request,
    UseGuards,
    Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import {
    WhatsappCrmService,
    UpdateContactCrmDto,
} from '../services/whatsapp-crm.service';

/**
 * RF20: Controller CRM para enriquecimento de contatos WhatsApp.
 */
@Controller('whatsapp/contacts')
@UseGuards(JwtAuthGuard)
export class WhatsappCrmController {

    constructor(private readonly crmService: WhatsappCrmService) { }

    @Get()
    async findAll(@Request() req: any, @Query('search') search?: string) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.crmService.findAll(vereadorId, search);
    }

    @Get('stats')
    async getStats(@Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.crmService.getStats(vereadorId);
    }

    @Get(':id')
    async findById(@Param('id') id: string, @Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.crmService.findById(id, vereadorId);
    }

    @Patch(':id')
    async updateCrm(
        @Param('id') id: string,
        @Body() dto: UpdateContactCrmDto,
        @Request() req: any,
    ) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.crmService.updateCrm(id, dto, vereadorId);
    }
}
