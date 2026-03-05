import { Injectable, Logger } from '@nestjs/common';
import { WhatsappApiService } from './whatsapp-api.service';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

/**
 * RF04: Serviço para tratamento de mídia recebida/enviada via WhatsApp.
 * Pipeline: capturar media_id → obter URL → download → salvar localmente.
 */
@Injectable()
export class WhatsappMediaService {
    private readonly logger = new Logger(WhatsappMediaService.name);
    private readonly uploadDir: string;

    constructor(private readonly whatsappApi: WhatsappApiService) {
        this.uploadDir = path.join(process.cwd(), 'uploads', 'whatsapp');
        this.ensureUploadDir();
    }

    private ensureUploadDir(): void {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
            this.logger.log(`📁 Diretório de uploads WhatsApp criado: ${this.uploadDir}`);
        }
    }

    /**
     * Download e armazenamento local de mídia recebida via webhook.
     * @param mediaId - ID da mídia retornado no webhook
     * @returns Caminho local do arquivo e mime type
     */
    async downloadAndStore(mediaId: string): Promise<{ localPath: string; mimeType: string }> {
        // 1. Obter URL da mídia via Graph API
        const { url, mimeType } = await this.whatsappApi.getMediaUrl(mediaId);

        // 2. Determinar extensão pelo mime type
        const extension = this.getExtensionFromMimeType(mimeType);
        const filename = `${uuidv4()}${extension}`;
        const localPath = path.join(this.uploadDir, filename);

        // 3. Download do arquivo
        const buffer = await this.whatsappApi.downloadMedia(url);

        // 4. Salvar no disco
        fs.writeFileSync(localPath, buffer);
        this.logger.log(`💾 Mídia salva: ${filename} (${mimeType}, ${buffer.length} bytes)`);

        // Retornar path relativo para servir via static assets
        return {
            localPath: `/uploads/whatsapp/${filename}`,
            mimeType,
        };
    }

    /**
     * Upload de mídia local para a Meta (para envio como mensagem).
     */
    async uploadToMeta(
        filePath: string,
        mimeType: string,
        originalName: string,
    ): Promise<string> {
        const absolutePath = path.join(process.cwd(), filePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Arquivo não encontrado: ${absolutePath}`);
        }

        const buffer = fs.readFileSync(absolutePath);
        return this.whatsappApi.uploadMedia(buffer, mimeType, originalName);
    }

    private getExtensionFromMimeType(mimeType: string): string {
        const map: Record<string, string> = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'image/gif': '.gif',
            'audio/ogg': '.ogg',
            'audio/mpeg': '.mp3',
            'audio/amr': '.amr',
            'audio/aac': '.aac',
            'video/mp4': '.mp4',
            'video/3gpp': '.3gp',
            'application/pdf': '.pdf',
            'application/vnd.ms-excel': '.xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/vnd.ms-powerpoint': '.ppt',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
        };
        return map[mimeType] || '.bin';
    }
}
