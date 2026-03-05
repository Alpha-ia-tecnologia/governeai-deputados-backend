import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WhatsappMessage } from './entities/whatsapp-message.entity';

/**
 * RF06: WebSocket Gateway para comunicação em tempo real do módulo WhatsApp.
 * 
 * Cada atendente se conecta ao namespace /whatsapp informando o vereadorId.
 * Mensagens novas, status updates e eventos de fila são emitidos para a room
 * correta, garantindo que somente atendentes do mesmo gabinete recebam dados.
 */
@WebSocketGateway({
    cors: { origin: '*' },
    namespace: '/whatsapp',
})
export class WhatsappGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(WhatsappGateway.name);
    private connectedClients: Map<string, { userId: string; vereadorId: string }> = new Map();

    // ─── Conexão ───
    handleConnection(client: Socket): void {
        const vereadorId = client.handshake.query.vereadorId as string;
        const userId = client.handshake.query.userId as string;

        if (!vereadorId || !userId) {
            this.logger.warn(`⚠️ Cliente conectou sem vereadorId/userId — desconectando: ${client.id}`);
            client.disconnect();
            return;
        }

        // Entrar na room do gabinete
        client.join(`vereador:${vereadorId}`);
        // Entrar na room individual do atendente
        client.join(`user:${userId}`);

        this.connectedClients.set(client.id, { userId, vereadorId });
        this.logger.log(`🟢 Atendente conectado: ${userId} (gabinete: ${vereadorId}) — socket: ${client.id}`);

        // Notificar outros que atendente ficou online
        this.server.to(`vereador:${vereadorId}`).emit('attendantOnline', { userId });
    }

    // ─── Desconexão ───
    handleDisconnect(client: Socket): void {
        const info = this.connectedClients.get(client.id);
        if (info) {
            this.server.to(`vereador:${info.vereadorId}`).emit('attendantOffline', { userId: info.userId });
            this.connectedClients.delete(client.id);
            this.logger.log(`🔴 Atendente desconectado: ${info.userId} — socket: ${client.id}`);
        }
    }

    // ─── RF06: Emitir nova mensagem recebida (chamado pelo WhatsappCoreService) ───
    emitNewMessage(vereadorId: string, conversationId: string, message: WhatsappMessage): void {
        this.server.to(`vereador:${vereadorId}`).emit('whatsapp:newMessage', {
            conversationId,
            message,
        });
    }

    // ─── RF08: Emitir atualização de status de entrega ───
    emitStatusUpdate(vereadorId: string, messageWamid: string, status: string): void {
        this.server.to(`vereador:${vereadorId}`).emit('whatsapp:statusUpdate', {
            wamid: messageWamid,
            status,
        });
    }

    // ─── Emitir atualização de conversa (assignment, transfer, resolve) ───
    emitConversationUpdate(vereadorId: string, conversationId: string, update: any): void {
        this.server.to(`vereador:${vereadorId}`).emit('whatsapp:conversationUpdate', {
            conversationId,
            ...update,
        });
    }

    // ─── Emitir nova conversa na fila ───
    emitNewConversation(vereadorId: string, conversation: any): void {
        this.server.to(`vereador:${vereadorId}`).emit('whatsapp:newConversation', conversation);
    }

    // ─── Emitir notificação direta para um atendente específico ───
    emitToUser(userId: string, event: string, data: any): void {
        this.server.to(`user:${userId}`).emit(event, data);
    }

    // ─── Client-side: atendente marca conversa como lida ───
    @SubscribeMessage('whatsapp:markRead')
    handleMarkRead(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string },
    ): void {
        const info = this.connectedClients.get(client.id);
        if (info) {
            this.logger.log(`📖 ${info.userId} marcou conversa ${data.conversationId} como lida`);
        }
    }

    // ─── Client-side: atendente está digitando ───
    @SubscribeMessage('whatsapp:typing')
    handleTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string },
    ): void {
        const info = this.connectedClients.get(client.id);
        if (info) {
            this.server.to(`vereador:${info.vereadorId}`).except(client.id).emit('whatsapp:typing', {
                conversationId: data.conversationId,
                userId: info.userId,
            });
        }
    }
}
