import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HubEventType, RecurrenceType } from '@prisma/client';

export class CreateEventDto {
  @ApiProperty()
  @IsString()
  calendarId!: string;

  @ApiPropertyOptional({ enum: HubEventType })
  @IsOptional()
  @IsEnum(HubEventType)
  type?: HubEventType;

  @ApiProperty({ example: 'Reunião de equipa' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiProperty()
  @IsDateString()
  endDate!: string;

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
