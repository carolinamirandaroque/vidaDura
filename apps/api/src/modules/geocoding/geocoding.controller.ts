import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GeocodingService } from './geocoding.service';

@ApiTags('geocoding')
@ApiBearerAuth()
@Controller('geocoding')
export class GeocodingController {
  constructor(private geocodingService: GeocodingService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search places (OpenStreetMap / Photon)' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'lang', required: false })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lon', required: false, type: Number })
  search(
    @Query('q') q: string,
    @Query('lang') lang?: string,
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
  ) {
    const parsedLat = lat ? Number(lat) : undefined;
    const parsedLon = lon ? Number(lon) : undefined;
    return this.geocodingService.search(
      q,
      lang ?? 'pt',
      Number.isFinite(parsedLat) ? parsedLat : undefined,
      Number.isFinite(parsedLon) ? parsedLon : undefined,
    );
  }
}
