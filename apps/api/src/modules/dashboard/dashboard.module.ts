import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { EventsModule } from '../events/events.module';
import { TasksModule } from '../tasks/tasks.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { ConnectionsModule } from '../connections/connections.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ShoppingListModule } from '../shopping-list/shopping-list.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    EventsModule,
    TasksModule,
    ExpensesModule,
    ConnectionsModule,
    NotificationsModule,
    ShoppingListModule,
    UsersModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
