import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappSettings } from '../entities/whatsapp-settings.entity';

export class UpdateSettingsDto {
    accessToken?: string;
    phoneNumberId?: string;
    businessAccountId?: string;
    verifyToken?: string;
    apiVersion?: string;
    botEnabled?: boolean;
    welcomeMessage?: string;
    offlineMessage?: string;
    businessHoursStart?: string;
    businessHoursEnd?: string;
    businessDays?: string;
    autoAssignEnabled?: boolean;
    maxConcurrentChats?: number;
    notifyNewConversation?: boolean;
    notifyTransfer?: boolean;
    soundEnabled?: boolean;
    webhookUrl?: string;
    evolutionApiUrl?: string;
    evolutionApiKey?: string;
}

@Injectable()
export class WhatsappSettingsService {
    private readonly logger = new Logger(WhatsappSettingsService.name);

    constructor(
        @InjectRepository(WhatsappSettings)
        private readonly settingsRepo: Repository<WhatsappSettings>,
    ) { }

    async getSettings(vereadorId: string): Promise<WhatsappSettings> {
        let settings = await this.settingsRepo.findOne({ where: { vereadorId } });
        if (!settings) {
            // Criar configurações padrão
            settings = this.settingsRepo.create({ vereadorId });
            settings = await this.settingsRepo.save(settings);
            this.logger.log(`⚙️ Configurações criadas para vereador ${vereadorId}`);
        }
        return settings;
    }

    async updateSettings(vereadorId: string, dto: UpdateSettingsDto): Promise<WhatsappSettings> {
        let settings = await this.getSettings(vereadorId);

        const fields: (keyof UpdateSettingsDto)[] = [
            'accessToken', 'phoneNumberId', 'businessAccountId', 'verifyToken',
            'apiVersion', 'botEnabled', 'welcomeMessage', 'offlineMessage',
            'businessHoursStart', 'businessHoursEnd', 'businessDays',
            'autoAssignEnabled', 'maxConcurrentChats',
            'notifyNewConversation', 'notifyTransfer', 'soundEnabled', 'webhookUrl',
            'evolutionApiUrl', 'evolutionApiKey',
        ];

        for (const field of fields) {
            if (dto[field] !== undefined) {
                (settings as any)[field] = dto[field];
            }
        }

        settings = await this.settingsRepo.save(settings);
        this.logger.log(`✅ Configurações atualizadas para vereador ${vereadorId}`);
        return settings;
    }

    async testConnection(vereadorId: string): Promise<{ success: boolean; message: string }> {
        const settings = await this.getSettings(vereadorId);

        if (!settings.accessToken || !settings.phoneNumberId) {
            return { success: false, message: 'Token de acesso ou ID do telefone não configurados' };
        }

        try {
            const axios = require('axios');
            const apiVersion = settings.apiVersion || 'v21.0';
            const response = await axios.get(
                `https://graph.facebook.com/${apiVersion}/${settings.phoneNumberId}`,
                {
                    headers: { Authorization: `Bearer ${settings.accessToken}` },
                    timeout: 10000,
                },
            );

            if (response.data?.id) {
                return {
                    success: true,
                    message: `Conexão OK! Número: ${response.data.display_phone_number || response.data.id}`,
                };
            }
            return { success: false, message: 'Resposta inesperada da API' };
        } catch (error: any) {
            const msg = error.response?.data?.error?.message || error.message;
            return { success: false, message: `Falha: ${msg}` };
        }
    }
}
