import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import {
    WhatsappContact,
    WhatsappConversation,
    WhatsappMessage,
    WhatsappTemplate,
    WhatsappLabel,
    WhatsappInternalNote,
    WhatsappBotFlow,
    WhatsappSettings,
    WhatsappChannel,
    EvolutionInboundMessage,
} from './entities';
import { WhatsappApiService } from './services/whatsapp-api.service';
import { WhatsappMediaService } from './services/whatsapp-media.service';
import { WhatsappCoreService } from './services/whatsapp-core.service';
import { WhatsappTemplateService } from './services/whatsapp-template.service';
import { WhatsappLabelService } from './services/whatsapp-label.service';
import { WhatsappCrmService } from './services/whatsapp-crm.service';
import { WhatsappBotService } from './services/whatsapp-bot.service';
import { WhatsappReportService } from './services/whatsapp-report.service';
import { WhatsappSettingsService } from './services/whatsapp-settings.service';
import { EvolutionApiService } from './services/evolution-api.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappTemplateController } from './controllers/whatsapp-template.controller';
import { WhatsappLabelController } from './controllers/whatsapp-label.controller';
import { WhatsappCrmController } from './controllers/whatsapp-crm.controller';
import { WhatsappBotController } from './controllers/whatsapp-bot.controller';
import { WhatsappReportController } from './controllers/whatsapp-report.controller';
import { WhatsappSettingsController } from './controllers/whatsapp-settings.controller';
import { WhatsappChannelController } from './controllers/whatsapp-channel.controller';
import { WhatsappGateway } from './whatsapp.gateway';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([
            WhatsappContact,
            WhatsappConversation,
            WhatsappMessage,
            WhatsappTemplate,
            WhatsappLabel,
            WhatsappInternalNote,
            WhatsappBotFlow,
            WhatsappSettings,
            WhatsappChannel,
            EvolutionInboundMessage,
        ]),
        MulterModule.register({ dest: './uploads/whatsapp' }),
    ],
    controllers: [WhatsappController, WhatsappTemplateController, WhatsappLabelController, WhatsappCrmController, WhatsappBotController, WhatsappReportController, WhatsappSettingsController, WhatsappChannelController],
    providers: [
        WhatsappApiService,
        WhatsappMediaService,
        WhatsappCoreService,
        WhatsappTemplateService,
        WhatsappLabelService,
        WhatsappCrmService,
        WhatsappBotService,
        WhatsappReportService,
        WhatsappSettingsService,
        EvolutionApiService,
        WhatsappGateway,
    ],
    exports: [
        WhatsappCoreService,
        WhatsappApiService,
    ],
})
export class WhatsappModule { }
