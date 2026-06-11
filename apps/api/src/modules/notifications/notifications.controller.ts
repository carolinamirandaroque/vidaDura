import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications' })
  findAll(@CurrentUser('sub') userId: string, @Query('unread') unread?: string) {
    return this.notificationsService.findAll(userId, unread === 'true');
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Count unread notifications' })
  countUnread(@CurrentUser('sub') userId: string) {
    return this.notificationsService.countUnread(userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(@CurrentUser('sub') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markAsRead(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.notificationsService.markAsRead(userId, id);
  }
}
