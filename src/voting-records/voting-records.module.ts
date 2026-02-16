import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VotingRecord } from './voting-record.entity';
import { VotingRecordsService } from './voting-records.service';
import { VotingRecordsController } from './voting-records.controller';

@Module({
    imports: [TypeOrmModule.forFeature([VotingRecord])],
    controllers: [VotingRecordsController],
    providers: [VotingRecordsService],
    exports: [VotingRecordsService],
})
export class VotingRecordsModule { }
