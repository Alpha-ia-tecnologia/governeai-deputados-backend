import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExecutiveRequest } from './executive-request.entity';
import { ExecutiveRequestsService } from './executive-requests.service';
import { ExecutiveRequestsController } from './executive-requests.controller';

@Module({
    imports: [TypeOrmModule.forFeature([ExecutiveRequest])],
    controllers: [ExecutiveRequestsController],
    providers: [ExecutiveRequestsService],
    exports: [ExecutiveRequestsService],
})
export class ExecutiveRequestsModule { }
