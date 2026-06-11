import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { HubEventType, RecurrenceType } from '@prisma/client';

export class UpdateEventDto {
  @ApiPropertyOptional({ enum: HubEventType })
  @IsOptional()
  @IsEnum(HubEventType)
  type?: HubEventType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiPropertyOptional({ enum: RecurrenceType })
  @IsOptional()
  @IsEnum(RecurrenceType)
  recurrence?: RecurrenceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  recurrenceEnd?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantIds?: string[];
}
