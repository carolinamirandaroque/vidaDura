import { Module } from '@nestjs/common';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';
import { ConnectionsRepository } from './connections.repository';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsService, ConnectionsRepository],
  exports: [ConnectionsService, ConnectionsRepository],
})
export class ConnectionsModule {}
