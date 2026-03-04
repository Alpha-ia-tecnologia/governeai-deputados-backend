import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Logger, UploadedFile, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, mkdirSync } from 'fs';

const uploadsDir = join(process.cwd(), 'uploads', 'chat');
if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
}

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
    private readonly logger = new Logger(ChatController.name);

    constructor(private readonly chatService: ChatService) { }

    // ==================== CONVERSATIONS ====================

    @Get('conversations')
    async getConversations(@CurrentUser() user: CurrentUserData) {
        return this.chatService.getConversations(user);
    }

    @Get('conversations/:id')
    async getConversationDetails(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
        return this.chatService.getConversationDetails(id, user);
    }

    // ==================== MESSAGES ====================

    @Get('conversations/:id/messages')
    async getMessages(
        @Param('id') id: string,
        @CurrentUser() user: CurrentUserData,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.chatService.getMessages(id, user, limit ? parseInt(limit) : 50, offset ? parseInt(offset) : 0);
    }

    @Post('conversations/:id/messages')
    async sendMessage(
        @Param('id') id: string,
        @CurrentUser() user: CurrentUserData,
        @Body() body: { content: string; attachmentUrl?: string; attachmentName?: string },
    ) {
        return this.chatService.sendMessage(id, user, body.content, body.attachmentUrl, body.attachmentName);
    }

    // ==================== DIRECT CONVERSATIONS ====================

    @Post('conversations/direct')
    async createDirectConversation(
        @CurrentUser() user: CurrentUserData,
        @Body() body: { targetUserId: string },
    ) {
        return this.chatService.createDirectConversation(user, body.targetUserId);
    }

    // ==================== GROUP CONVERSATIONS ====================

    @Post('conversations/group')
    async createGroup(
        @CurrentUser() user: CurrentUserData,
        @Body() body: { name: string; memberIds: string[] },
    ) {
        return this.chatService.createGroup(user, body.name, body.memberIds);
    }

    @Patch('conversations/:id')
    async updateGroup(
        @Param('id') id: string,
        @CurrentUser() user: CurrentUserData,
        @Body() body: { name: string },
    ) {
        return this.chatService.updateGroup(id, user, body.name);
    }

    @Post('conversations/:id/members')
    async addMember(
        @Param('id') id: string,
        @CurrentUser() user: CurrentUserData,
        @Body() body: { userId: string },
    ) {
        return this.chatService.addMember(id, user, body.userId);
    }

    @Delete('conversations/:id/members/:userId')
    async removeMember(
        @Param('id') id: string,
        @Param('userId') userId: string,
        @CurrentUser() user: CurrentUserData,
    ) {
        return this.chatService.removeMember(id, user, userId);
    }

    @Delete('conversations/:id')
    async deleteGroup(
        @Param('id') id: string,
        @CurrentUser() user: CurrentUserData,
    ) {
        return this.chatService.deleteGroup(id, user);
    }

    // ==================== FILE UPLOAD ====================

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: uploadsDir,
            filename: (req, file, cb) => {
                const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
                cb(null, uniqueName);
            },
        }),
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }))
    async uploadFile(@UploadedFile() file: any) {
        this.logger.log(`File uploaded: ${file.originalname} -> ${file.filename}`);
        return {
            url: `/uploads/chat/${file.filename}`,
            name: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
        };
    }
}
