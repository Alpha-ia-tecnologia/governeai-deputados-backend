import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Request,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import {
    WhatsappLabelService,
    CreateLabelDto,
    UpdateLabelDto,
} from '../services/whatsapp-label.service';

/**
 * RF19: Controller para gerenciamento de Labels/Tags do WhatsApp.
 */
@Controller('whatsapp/labels')
@UseGuards(JwtAuthGuard)
export class WhatsappLabelController {

    constructor(private readonly labelService: WhatsappLabelService) { }

    @Get()
    async findAll(@Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.labelService.findAll(vereadorId);
    }

    @Get(':id')
    async findById(@Param('id') id: string, @Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.labelService.findById(id, vereadorId);
    }

    @Get(':id/contacts')
    async getContactsByLabel(@Param('id') id: string, @Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.labelService.getContactsByLabel(id, vereadorId);
    }

    @Post()
    async create(@Body() dto: CreateLabelDto, @Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.labelService.create(dto, vereadorId);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateLabelDto, @Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.labelService.update(id, dto, vereadorId);
    }

    @Delete(':id')
    async delete(@Param('id') id: string, @Request() req: any) {
        const vereadorId = req.user.vereadorId || req.user.id;
        await this.labelService.delete(id, vereadorId);
        return { message: 'Label removida com sucesso' };
    }

    @Post(':labelId/contacts/:contactId')
    async addToContact(
        @Param('labelId') labelId: string,
        @Param('contactId') contactId: string,
        @Request() req: any,
    ) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.labelService.addLabelToContact(labelId, contactId, vereadorId);
    }

    @Delete(':labelId/contacts/:contactId')
    async removeFromContact(
        @Param('labelId') labelId: string,
        @Param('contactId') contactId: string,
        @Request() req: any,
    ) {
        const vereadorId = req.user.vereadorId || req.user.id;
        return this.labelService.removeLabelFromContact(labelId, contactId, vereadorId);
    }
}
