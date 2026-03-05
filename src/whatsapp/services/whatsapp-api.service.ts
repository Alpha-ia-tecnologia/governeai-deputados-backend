import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * Service para comunicação direta com a Graph API da Meta (WhatsApp Cloud API).
 * Gerencia envio de mensagens, upload de mídia e gestão de templates.
 */
@Injectable()
export class WhatsappApiService {
    private readonly logger = new Logger(WhatsappApiService.name);
    private readonly graphApi: AxiosInstance;
    private readonly phoneNumberId: string;
    private readonly wabaId: string;
    private readonly accessToken: string;

    constructor(private configService: ConfigService) {
        const apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION', 'v21.0');
        this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN', '');
        this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID', '');
        this.wabaId = this.configService.get<string>('WHATSAPP_BUSINESS_ACCOUNT_ID', '');

        this.graphApi = axios.create({
            baseURL: `https://graph.facebook.com/${apiVersion}`,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
        });
    }

    // ─── RF03: Envio de Mensagens de Texto ───
    async sendTextMessage(to: string, body: string): Promise<{ messageId: string }> {
        try {
            const response = await this.graphApi.post(`/${this.phoneNumberId}/messages`, {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'text',
                text: { body },
            });

            const messageId = response.data.messages?.[0]?.id;
            this.logger.log(`✅ Mensagem enviada para ${to} - wamid: ${messageId}`);
            return { messageId };
        } catch (error) {
            this.logger.error(`❌ Erro ao enviar mensagem para ${to}:`, error.response?.data || error.message);
            throw error;
        }
    }

    // ─── RF03: Envio de Mensagem com Mídia ───
    async sendMediaMessage(
        to: string,
        type: 'image' | 'audio' | 'video' | 'document',
        mediaId: string,
        caption?: string,
        filename?: string,
    ): Promise<{ messageId: string }> {
        const mediaPayload: any = { id: mediaId };
        if (caption) mediaPayload.caption = caption;
        if (filename && type === 'document') mediaPayload.filename = filename;

        try {
            const response = await this.graphApi.post(`/${this.phoneNumberId}/messages`, {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type,
                [type]: mediaPayload,
            });

            const messageId = response.data.messages?.[0]?.id;
            this.logger.log(`✅ Mídia ${type} enviada para ${to} - wamid: ${messageId}`);
            return { messageId };
        } catch (error) {
            this.logger.error(`❌ Erro ao enviar mídia para ${to}:`, error.response?.data || error.message);
            throw error;
        }
    }

    // ─── RF04: Obter URL de Mídia pelo ID ───
    async getMediaUrl(mediaId: string): Promise<{ url: string; mimeType: string }> {
        try {
            const response = await this.graphApi.get(`/${mediaId}`);
            return {
                url: response.data.url,
                mimeType: response.data.mime_type,
            };
        } catch (error) {
            this.logger.error(`❌ Erro ao obter URL da mídia ${mediaId}:`, error.response?.data || error.message);
            throw error;
        }
    }

    // ─── RF04: Download de Mídia (com token de acesso) ───
    async downloadMedia(url: string): Promise<Buffer> {
        try {
            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` },
                responseType: 'arraybuffer',
            });
            return Buffer.from(response.data);
        } catch (error) {
            this.logger.error(`❌ Erro ao fazer download da mídia:`, error.message);
            throw error;
        }
    }

    // ─── RF04: Upload de Mídia para a Meta ───
    async uploadMedia(fileBuffer: Buffer, mimeType: string, filename: string): Promise<string> {
        const FormData = require('form-data');
        const form = new FormData();
        form.append('file', fileBuffer, { filename, contentType: mimeType });
        form.append('messaging_product', 'whatsapp');
        form.append('type', mimeType);

        try {
            const response = await this.graphApi.post(`/${this.phoneNumberId}/media`, form, {
                headers: { ...form.getHeaders(), 'Authorization': `Bearer ${this.accessToken}` },
            });
            this.logger.log(`✅ Mídia uploaded: ${response.data.id}`);
            return response.data.id;
        } catch (error) {
            this.logger.error(`❌ Erro ao fazer upload de mídia:`, error.response?.data || error.message);
            throw error;
        }
    }

    // ─── RF17: Envio de Template ───
    async sendTemplateMessage(
        to: string,
        templateName: string,
        languageCode: string,
        components?: any[],
    ): Promise<{ messageId: string }> {
        const templatePayload: any = {
            name: templateName,
            language: { code: languageCode },
        };
        if (components && components.length > 0) {
            templatePayload.components = components;
        }

        try {
            const response = await this.graphApi.post(`/${this.phoneNumberId}/messages`, {
                messaging_product: 'whatsapp',
                to,
                type: 'template',
                template: templatePayload,
            });

            const messageId = response.data.messages?.[0]?.id;
            this.logger.log(`✅ Template "${templateName}" enviado para ${to} - wamid: ${messageId}`);
            return { messageId };
        } catch (error) {
            this.logger.error(`❌ Erro ao enviar template para ${to}:`, error.response?.data || error.message);
            throw error;
        }
    }

    // ─── RF22: Envio de Mensagem Interativa (Botões) ───
    async sendInteractiveButtons(
        to: string,
        bodyText: string,
        buttons: Array<{ id: string; title: string }>,
        headerText?: string,
        footerText?: string,
    ): Promise<{ messageId: string }> {
        const interactive: any = {
            type: 'button',
            body: { text: bodyText },
            action: {
                buttons: buttons.map(btn => ({
                    type: 'reply',
                    reply: { id: btn.id, title: btn.title },
                })),
            },
        };
        if (headerText) interactive.header = { type: 'text', text: headerText };
        if (footerText) interactive.footer = { text: footerText };

        try {
            const response = await this.graphApi.post(`/${this.phoneNumberId}/messages`, {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'interactive',
                interactive,
            });

            const messageId = response.data.messages?.[0]?.id;
            this.logger.log(`✅ Botões interativos enviados para ${to} - wamid: ${messageId}`);
            return { messageId };
        } catch (error) {
            this.logger.error(`❌ Erro ao enviar botões interativos:`, error.response?.data || error.message);
            throw error;
        }
    }

    // ─── RF22: Envio de Mensagem Interativa (Lista) ───
    async sendInteractiveList(
        to: string,
        bodyText: string,
        buttonLabel: string,
        sections: Array<{
            title: string;
            rows: Array<{ id: string; title: string; description?: string }>;
        }>,
        headerText?: string,
        footerText?: string,
    ): Promise<{ messageId: string }> {
        const interactive: any = {
            type: 'list',
            body: { text: bodyText },
            action: { button: buttonLabel, sections },
        };
        if (headerText) interactive.header = { type: 'text', text: headerText };
        if (footerText) interactive.footer = { text: footerText };

        try {
            const response = await this.graphApi.post(`/${this.phoneNumberId}/messages`, {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'interactive',
                interactive,
            });

            const messageId = response.data.messages?.[0]?.id;
            this.logger.log(`✅ Lista interativa enviada para ${to} - wamid: ${messageId}`);
            return { messageId };
        } catch (error) {
            this.logger.error(`❌ Erro ao enviar lista interativa:`, error.response?.data || error.message);
            throw error;
        }
    }

    // ─── RF15: Criar Template na Meta ───
    async createTemplate(
        name: string,
        language: string,
        category: string,
        components: any[],
    ): Promise<{ templateId: string }> {
        try {
            const response = await this.graphApi.post(`/${this.wabaId}/message_templates`, {
                name,
                language,
                category,
                components,
            });

            this.logger.log(`✅ Template "${name}" criado na Meta: ${response.data.id}`);
            return { templateId: response.data.id };
        } catch (error) {
            this.logger.error(`❌ Erro ao criar template "${name}":`, error.response?.data || error.message);
            throw error;
        }
    }

    // ─── RF05: Marcar mensagem como lida ───
    async markAsRead(messageId: string): Promise<void> {
        try {
            await this.graphApi.post(`/${this.phoneNumberId}/messages`, {
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId,
            });
        } catch (error) {
            this.logger.warn(`⚠️ Erro ao marcar como lido ${messageId}:`, error.response?.data || error.message);
        }
    }
}
