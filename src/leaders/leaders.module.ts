import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Leader } from './leader.entity';
import { LeadersService } from './leaders.service';
import { LeadersController } from './leaders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Leader])],
  controllers: [LeadersController],
  providers: [LeadersService],
  exports: [LeadersService],
})
export class LeadersModule {}
