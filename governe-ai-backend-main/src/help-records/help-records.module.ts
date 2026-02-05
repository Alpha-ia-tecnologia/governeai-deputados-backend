import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HelpRecord } from './help-record.entity';
import { HelpRecordsService } from './help-records.service';
import { HelpRecordsController } from './help-records.controller';
import { Voter } from '../voters/voter.entity';
import { Leader } from '../leaders/leader.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HelpRecord, Voter, Leader, User])],
  controllers: [HelpRecordsController],
  providers: [HelpRecordsService],
  exports: [HelpRecordsService],
})
export class HelpRecordsModule {}
