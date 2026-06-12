import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { EventKind } from '@lifehub/types';
import { HubEventType, RecurrenceType } from '@prisma/client';

const EVENT_KINDS = ['appointment', 'deadline'] as const satisfies readonly EventKind[];

export class CreateEventDto {
  @ApiProperty()
  @IsString()
  calendarId!: string;

  @ApiPropertyOptional({ enum: EVENT_KINDS })
  @IsOptional()
  @IsIn(EVENT_KINDS)
  kind?: EventKind;

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

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value != null)
  @IsNumber()
  locationLat?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value != null)
  @IsNumber()
  locationLng?: number | null;

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
