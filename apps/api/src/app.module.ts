import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { WebsocketModule } from './infrastructure/websocket/websocket.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ConnectionsModule } from './modules/connections/connections.module';
import { CalendarsModule } from './modules/calendars/calendars.module';
import { EventsModule } from './modules/events/events.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ShoppingListModule } from './modules/shopping-list/shopping-list.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    WebsocketModule,
    AuthModule,
    UsersModule,
    ConnectionsModule,
    CalendarsModule,
    EventsModule,
    TasksModule,
    ExpensesModule,
    NotificationsModule,
    DashboardModule,
    ShoppingListModule,
  ],
})
export class AppModule {}
