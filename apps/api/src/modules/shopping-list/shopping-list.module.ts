import { Module } from '@nestjs/common';
import { ShoppingListController } from './shopping-list.controller';
import { ShoppingListService } from './shopping-list.service';
import { ShoppingListRepository } from './shopping-list.repository';
import { ConnectionsModule } from '../connections/connections.module';

@Module({
  imports: [ConnectionsModule],
  controllers: [ShoppingListController],
  providers: [ShoppingListService, ShoppingListRepository],
  exports: [ShoppingListService, ShoppingListRepository],
})
export class ShoppingListModule {}
