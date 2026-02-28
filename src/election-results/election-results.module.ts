import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElectionResult } from './election-result.entity';
import { VotingLocation } from './voting-location.entity';
import { ElectionResultsService } from './election-results.service';
import { ElectionResultsController } from './election-results.controller';
import { DeepseekAiService } from './deepseek-ai.service';

@Module({
    imports: [TypeOrmModule.forFeature([ElectionResult, VotingLocation])],
    providers: [ElectionResultsService, DeepseekAiService],
    controllers: [ElectionResultsController],
    exports: [ElectionResultsService, DeepseekAiService],
})
export class ElectionResultsModule { }

