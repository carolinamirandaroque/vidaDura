import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { ConnectionsModule } from '../connections/connections.module';

@Module({
  imports: [ConnectionsModule],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository],
  exports: [TasksService, TasksRepository],
})
export class TasksModule {}
