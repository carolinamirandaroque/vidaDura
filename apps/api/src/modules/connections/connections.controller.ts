import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConnectionsService } from './connections.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('connections')
@ApiBearerAuth()
@Controller('connections')
export class ConnectionsController {
  constructor(private connectionsService: ConnectionsService) {}

  @Get()
  @ApiOperation({ summary: 'List connections' })
  getConnections(@CurrentUser('sub') userId: string, @Query('status') status?: string) {
    return this.connectionsService.getConnections(userId, status);
  }

  @Get('contacts')
  @ApiOperation({ summary: 'List accepted contacts' })
  getContacts(@CurrentUser('sub') userId: string) {
    return this.connectionsService.getContacts(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Send connection request' })
  sendRequest(@CurrentUser('sub') userId: string, @Body() dto: CreateConnectionDto) {
    return this.connectionsService.sendRequest(userId, dto.receiverId);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept connection request' })
  accept(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.connectionsService.acceptRequest(userId, id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject connection request' })
  reject(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.connectionsService.rejectRequest(userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove connection' })
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.connectionsService.removeConnection(userId, id);
  }
}
