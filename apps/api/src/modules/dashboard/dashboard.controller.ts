import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard data' })
  getDashboard(@CurrentUser('sub') userId: string) {
    return this.dashboardService.getDashboard(userId);
  }
}
