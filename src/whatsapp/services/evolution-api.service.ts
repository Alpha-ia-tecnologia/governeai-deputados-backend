import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappSettings } from '../entities/whatsapp-settings.entity';
import { WhatsappChannel, ChannelStatus } from '../entities/whatsapp-channel.entity';
import { EvolutionInboundMessage } from '../entities/evolution-inbound-message.entity';
import axios from 'axios';

@Injectable()
export class EvolutionApiService {
    private readonly logger = new Logger(EvolutionApiService.name);

    constructor(
        @InjectRepository(WhatsappSettings)
        private readonly settingsRepo: Repository<WhatsappSettings>,
        @InjectRepository(WhatsappChannel)
        private readonly channelRepo: Repository<WhatsappChannel>,
        @InjectRepository(EvolutionInboundMessage)
        private readonly inboundMsgRepo: Repository<EvolutionInboundMessage>,
    ) { }

    // ─── Helpers ───

    private async getCredentials(vereadorId: string) {
        const settings = await this.settingsRepo.findOne({ where: { vereadorId } });
        if (!settings?.evolutionApiUrl || !settings?.evolutionApiKey) {
            throw new BadRequestException('URL ou API Key da Evolution API não configurados. Acesse Configurações para definir.');
        }
        // Remove trailing slash
        const baseUrl = settings.evolutionApiUrl.replace(/\/+$/, '');
        return { baseUrl, apiKey: settings.evolutionApiKey };
    }

    private async request(vereadorId: string, method: 'get' | 'post' | 'delete', path: string, data?: any) {
        const { baseUrl, apiKey } = await this.getCredentials(vereadorId);
        const url = `${baseUrl}${path}`;
        this.logger.debug(`Evolution API ${method.toUpperCase()} ${url}`);
        try {
            const response = await axios({
                method,
                url,
                data,
                headers: { apikey: apiKey, 'Content-Type': 'application/json' },
                timeout: 30000,
            });
            return response.data;
        } catch (error: any) {
            const msg = error.response?.data?.message || error.response?.data?.error || error.message;
            this.logger.error(`Evolution API error: ${msg}`);
            throw new BadRequestException(`Evolution API: ${msg}`);
        }
    }

    // ─── Channel CRUD ───

    async getChannels(vereadorId: string): Promise<WhatsappChannel[]> {
        return this.channelRepo.find({
            where: { vereadorId },
            order: { createdAt: 'DESC' },
        });
    }

    async createChannel(vereadorId: string, instanceName: string): Promise<{ channel: WhatsappChannel; qrcode?: any }> {
        // Check if name already exists for this vereador
        const existing = await this.channelRepo.findOne({ where: { vereadorId, instanceName } });
        if (existing) {
            throw new BadRequestException(`Já existe um canal com o nome "${instanceName}"`);
        }

        // Create instance on Evolution API
        const result = await this.request(vereadorId, 'post', '/instance/create', {
            instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
        });

        // Save channel in DB
        const channel = this.channelRepo.create({
            vereadorId,
            instanceName: result.instance?.instanceName || instanceName,
            instanceId: result.instance?.instanceId || null,
            status: ChannelStatus.CREATED,
        });
        const saved = await this.channelRepo.save(channel);
        this.logger.log(`📱 Canal criado: ${instanceName} para vereador ${vereadorId}`);

        return {
            channel: saved,
            qrcode: result.qrcode,
        };
    }

    async getQrCode(vereadorId: string, channelId: string): Promise<any> {
        const channel = await this.channelRepo.findOne({ where: { id: channelId, vereadorId } });
        if (!channel) throw new BadRequestException('Canal não encontrado');

        const result = await this.request(vereadorId, 'get', `/instance/connect/${channel.instanceName}`);
        return result;
    }

    async getChannelStatus(vereadorId: string, channelId: string): Promise<{ channel: WhatsappChannel; state: string }> {
        const channel = await this.channelRepo.findOne({ where: { id: channelId, vereadorId } });
        if (!channel) throw new BadRequestException('Canal não encontrado');

        try {
            const result = await this.request(vereadorId, 'get', `/instance/connectionState/${channel.instanceName}`);
            const state = result?.instance?.state || result?.state || 'close';

            // Update status in DB
            let newStatus = ChannelStatus.DISCONNECTED;
            if (state === 'open') newStatus = ChannelStatus.CONNECTED;
            else if (state === 'connecting') newStatus = ChannelStatus.CONNECTING;

            if (channel.status !== newStatus) {
                channel.status = newStatus;
                await this.channelRepo.save(channel);
            }

            return { channel, state };
        } catch {
            channel.status = ChannelStatus.DISCONNECTED;
            await this.channelRepo.save(channel);
            return { channel, state: 'close' };
        }
    }

    async deleteChannel(vereadorId: string, channelId: string): Promise<void> {
        const channel = await this.channelRepo.findOne({ where: { id: channelId, vereadorId } });
        if (!channel) throw new BadRequestException('Canal não encontrado');

        try {
            // Try to logout first
            await this.request(vereadorId, 'delete', `/instance/logout/${channel.instanceName}`);
        } catch { /* ignore */ }

        try {
            // Delete instance from Evolution
            await this.request(vereadorId, 'delete', `/instance/delete/${channel.instanceName}`);
        } catch { /* ignore */ }

        await this.channelRepo.remove(channel);
        this.logger.log(`🗑️ Canal removido: ${channel.instanceName}`);
    }

    async testEvolutionConnection(vereadorId: string): Promise<{ success: boolean; message: string }> {
        try {
            const { baseUrl, apiKey } = await this.getCredentials(vereadorId);
            const response = await axios.get(`${baseUrl}/instance/fetchInstances`, {
                headers: { apikey: apiKey },
                timeout: 10000,
            });
            if (response.status === 200) {
                const count = Array.isArray(response.data) ? response.data.length : 0;
                return { success: true, message: `Conexão OK! ${count} instância(s) encontrada(s) no servidor.` };
            }
            return { success: false, message: 'Resposta inesperada do servidor' };
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message;
            return { success: false, message: `Falha: ${msg}` };
        }
    }

    // ─── Chat / Message Fetching from Evolution API ───

    async getFirstConnectedChannel(vereadorId: string): Promise<WhatsappChannel | null> {
        // Always query the Evolution API for live connected instances
        try {
            const { baseUrl, apiKey } = await this.getCredentials(vereadorId);
            const response = await axios.get(`${baseUrl}/instance/fetchInstances`, {
                headers: { apikey: apiKey },
                timeout: 10000,
            });
            const instances = Array.isArray(response.data) ? response.data : [];

            // Find a connected instance
            const openInstance = instances.find((inst: any) =>
                inst.connectionStatus === 'open' || inst.connectionStatus === 'connected',
            );
            const targetInstance = openInstance || instances.find((inst: any) => inst.name);

            if (targetInstance) {
                const instanceName = targetInstance.name || targetInstance.instanceName || 'default';

                // Check if DB has a matching channel
                const existingChannel = await this.channelRepo.findOne({
                    where: { vereadorId },
                    order: { createdAt: 'DESC' },
                });

                if (existingChannel) {
                    // Update DB if instance name changed
                    if (existingChannel.instanceName !== instanceName) {
                        this.logger.log(`🔄 Instance name changed: ${existingChannel.instanceName} → ${instanceName}`);
                        existingChannel.instanceName = instanceName;
                    }
                    existingChannel.instanceId = targetInstance.id || existingChannel.instanceId;
                    existingChannel.status = openInstance ? ChannelStatus.CONNECTED : ChannelStatus.DISCONNECTED;
                    return this.channelRepo.save(existingChannel);
                }

                // No DB record — create one
                this.logger.log(`🔍 Auto-discovered instance: ${instanceName} for vereador ${vereadorId}`);
                const channel = this.channelRepo.create({
                    vereadorId,
                    instanceName,
                    instanceId: targetInstance.id || null,
                    status: openInstance ? ChannelStatus.CONNECTED : ChannelStatus.CREATED,
                });
                return this.channelRepo.save(channel);
            }
        } catch (error: any) {
            this.logger.warn(`Live instance check failed: ${error.message}`);
        }

        // Fallback: use whatever is in DB
        return this.channelRepo.findOne({
            where: { vereadorId },
            order: { createdAt: 'DESC' },
        });
    }

    async fetchChats(vereadorId: string): Promise<any[]> {
        const channel = await this.getFirstConnectedChannel(vereadorId);
        if (!channel) return [];

        try {
            const result = await this.request(vereadorId, 'post', `/chat/findChats/${channel.instanceName}`, {});
            if (!Array.isArray(result)) return [];

            // Transform to our conversation format
            // Evolution API v2 uses: remoteJid, pushName, updatedAt, lastMessage
            return result
                .filter((chat: any) => {
                    const jid = chat.remoteJid || chat.id || '';
                    return jid.endsWith('@s.whatsapp.net'); // Only personal chats, not groups
                })
                .map((chat: any) => {
                    const jid = chat.remoteJid || chat.id || '';
                    const phone = jid.replace('@s.whatsapp.net', '');
                    const name = chat.pushName || chat.name || phone;
                    const lastMsg = chat.lastMessage?.message?.conversation
                        || chat.lastMessage?.message?.extendedTextMessage?.text
                        || chat.lastMessage?.message?.imageMessage?.caption
                        || '';
                    const timestamp = chat.updatedAt
                        || (chat.lastMessage?.messageTimestamp
                            ? new Date(Number(chat.lastMessage.messageTimestamp) * 1000).toISOString()
                            : new Date().toISOString());

                    return {
                        id: `evo_${channel.instanceName}_${phone}`,
                        contactId: phone,
                        contact: {
                            id: phone,
                            phone,
                            name,
                            profileName: name,
                            email: null,
                            cpf: null,
                            notes: null,
                            companyName: null,
                        },
                        vereadorId,
                        assignedToId: null,
                        assignedTo: null,
                        status: 'active',
                        lastClientMessageAt: timestamp,
                        resolvedAt: null,
                        isBotActive: false,
                        createdAt: timestamp,
                        updatedAt: timestamp,
                        _lastMessage: lastMsg,
                        _channelInstanceName: channel.instanceName,
                        _remoteJid: jid,
                    };
                })
                .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        } catch (error: any) {
            this.logger.error(`Erro ao buscar chats: ${error.message}`);
            return [];
        }
    }

    private formatMessageOutput(msg: { id: string; fromMe: boolean; content: string | null; type: string; timestamp: number; }, instanceName: string, remoteJid: string, vereadorId: string) {
        const ts = new Date(msg.timestamp * 1000).toISOString();
        return {
            id: msg.id,
            conversationId: `evo_${instanceName}_${remoteJid.replace('@s.whatsapp.net', '')}`,
            wamid: msg.id,
            direction: msg.fromMe ? 'outbound' : 'inbound',
            type: msg.type,
            content: msg.content || null,
            mediaId: null,
            mediaMimeType: null,
            mediaLocalPath: null,
            mediaCaption: null,
            latitude: null,
            longitude: null,
            locationName: null,
            locationAddress: null,
            deliveryStatus: msg.fromMe ? 'read' : 'delivered',
            senderUserId: msg.fromMe ? vereadorId : null,
            senderUser: null,
            createdAt: ts,
        };
    }

    async fetchMessages(vereadorId: string, remoteJid: string, instanceName: string): Promise<any[]> {
        // Fetch outbound from Evolution API + inbound from our DB in parallel
        const [apiMessages, dbInbound] = await Promise.all([
            this.fetchApiMessages(vereadorId, instanceName, remoteJid),
            this.inboundMsgRepo.find({
                where: { remoteJid, instanceName },
                order: { messageTimestamp: 'ASC' },
                take: 200,
            }).catch(() => [] as EvolutionInboundMessage[]),
        ]);

        // Convert API messages
        const outMessages = apiMessages.map(msg => this.formatMessageOutput(msg, instanceName, remoteJid, vereadorId));

        // Convert DB inbound messages
        const inMessages = dbInbound.map(msg => this.formatMessageOutput({
            id: msg.messageId,
            fromMe: msg.fromMe,
            content: msg.content,
            type: msg.messageType === 'conversation' ? 'text' : msg.messageType,
            timestamp: Number(msg.messageTimestamp),
        }, instanceName, remoteJid, vereadorId));

        // Merge and sort by timestamp, deduplicate by id
        const allMessages = [...outMessages, ...inMessages];
        const seen = new Set<string>();
        const unique = allMessages.filter(m => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
        });

        return unique.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    private async fetchApiMessages(vereadorId: string, instanceName: string, remoteJid: string): Promise<{ id: string; fromMe: boolean; content: string | null; type: string; timestamp: number }[]> {
        try {
            const result = await this.request(vereadorId, 'post', `/chat/findMessages/${instanceName}`, {
                where: { key: { remoteJid } },
                limit: 100,
            });

            let records: any[] = [];
            if (result?.messages?.records && Array.isArray(result.messages.records)) {
                records = result.messages.records;
            } else if (Array.isArray(result)) {
                records = result;
            } else {
                return [];
            }

            return records.map((msg: any) => {
                const isFromMe = msg.key?.fromMe || false;
                let content = msg.message?.conversation
                    || msg.message?.extendedTextMessage?.text
                    || msg.message?.imageMessage?.caption
                    || msg.message?.videoMessage?.caption
                    || msg.message?.documentMessage?.fileName
                    || (msg.message?.audioMessage ? '🎵 Áudio' : '')
                    || (msg.message?.imageMessage ? '📷 Imagem' : '')
                    || (msg.message?.videoMessage ? '🎥 Vídeo' : '')
                    || (msg.message?.stickerMessage ? '🏷️ Sticker' : '')
                    || (msg.message?.contactMessage ? '👤 Contato' : '')
                    || (msg.message?.locationMessage ? '📍 Localização' : '')
                    || '';

                let type = 'text';
                const msgType = msg.messageType || '';
                if (msgType === 'imageMessage' || msg.message?.imageMessage) type = 'image';
                else if (msgType === 'audioMessage' || msg.message?.audioMessage) type = 'audio';
                else if (msgType === 'videoMessage' || msg.message?.videoMessage) type = 'video';
                else if (msgType === 'documentMessage' || msg.message?.documentMessage) type = 'document';
                else if (msgType === 'stickerMessage' || msg.message?.stickerMessage) type = 'sticker';
                else if (msgType === 'locationMessage' || msg.message?.locationMessage) type = 'location';
                else if (msgType === 'contactMessage' || msg.message?.contactMessage) type = 'contact';

                if (!content && !isFromMe) {
                    content = '💬 Mensagem recebida';
                }

                return {
                    id: msg.key?.id || `msg_${Math.random().toString(36).substring(7)}`,
                    fromMe: isFromMe,
                    content: content || null,
                    type,
                    timestamp: Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000),
                };
            }).filter(m => m.content); // Remove messages with no content
        } catch (error: any) {
            this.logger.error(`Erro ao buscar mensagens da API: ${error.message}`);
            return [];
        }
    }

    // ─── Webhook Handler ───

    async handleIncomingWebhook(body: any): Promise<void> {
        try {
            const event = body.event;
            const data = body.data;
            const instance = body.instance;
            const instanceName = instance || body.instanceName || '';

            if (event === 'messages.upsert' && data) {
                const key = data.key;
                const messageId = key?.id;
                const fromMe = key?.fromMe || false;
                const remoteJid = key?.remoteJid || '';

                if (messageId && remoteJid.endsWith('@s.whatsapp.net')) {
                    // Extract content from webhook data
                    const msg = data.message;
                    const content = msg?.conversation
                        || msg?.extendedTextMessage?.text
                        || msg?.imageMessage?.caption
                        || msg?.videoMessage?.caption
                        || msg?.documentMessage?.fileName
                        || (msg?.audioMessage ? '🎵 Áudio' : '')
                        || (msg?.imageMessage ? '📷 Imagem' : '')
                        || (msg?.videoMessage ? '🎥 Vídeo' : '')
                        || (msg?.stickerMessage ? '🏷️ Sticker' : '')
                        || (msg?.contactMessage ? '👤 Contato' : '')
                        || (msg?.locationMessage ? '📍 Localização' : '')
                        || '💬 Mensagem';

                    const timestamp = data.messageTimestamp || Math.floor(Date.now() / 1000);
                    const messageType = data.messageType || 'conversation';
                    const pushName = data.pushName || key?.pushName || '';

                    // Persist to DB (upsert by messageId)
                    try {
                        const existing = await this.inboundMsgRepo.findOne({ where: { messageId } });
                        if (!existing) {
                            await this.inboundMsgRepo.save({
                                messageId,
                                instanceName,
                                remoteJid,
                                pushName,
                                content,
                                messageType,
                                messageTimestamp: timestamp,
                                fromMe,
                            });
                            this.logger.log(`📥 Saved inbound msg ${messageId} from ${remoteJid}: ${content.substring(0, 30)}`);
                        }
                    } catch (dbErr: any) {
                        // Ignore duplicate key errors
                        if (!dbErr.message?.includes('duplicate')) {
                            this.logger.error(`DB save error: ${dbErr.message}`);
                        }
                    }
                }
            }
        } catch (error: any) {
            this.logger.error(`Erro ao processar webhook: ${error.message}`);
        }
    }

    async configureWebhook(vereadorId: string, webhookUrl: string): Promise<any> {
        const channel = await this.getFirstConnectedChannel(vereadorId);
        if (!channel) throw new BadRequestException('Nenhum canal conectado');

        return this.request(vereadorId, 'post', `/webhook/set/${channel.instanceName}`, {
            webhook: {
                enabled: true,
                url: webhookUrl,
                webhookByEvents: false,
                webhookBase64: false,
                events: ['MESSAGES_UPSERT'],
            },
        });
    }

    async sendTextMessage(vereadorId: string, instanceName: string, remoteJid: string, text: string): Promise<any> {
        const number = remoteJid.replace('@s.whatsapp.net', '');
        const result = await this.request(vereadorId, 'post', `/message/sendText/${instanceName}`, {
            number,
            text,
        });
        return result;
    }
}
