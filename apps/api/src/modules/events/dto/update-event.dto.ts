import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { DeadlineStatus, EventKind } from '@lifehub/types';
import { HubEventType, RecurrenceType } from '@prisma/client';

const EVENT_KINDS = ['appointment', 'deadline'] as const satisfies readonly EventKind[];
const DEADLINE_STATUSES = ['pending', 'done'] as const satisfies readonly DeadlineStatus[];

export class UpdateEventDto {
  @ApiPropertyOptional({ enum: EVENT_KINDS })
  @IsOptional()
  @IsIn(EVENT_KINDS)
  kind?: EventKind;

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

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value != null)
  @IsDateString()
  recurrenceEnd?: string | null;

  @ApiPropertyOptional({ enum: DEADLINE_STATUSES })
  @IsOptional()
  @IsIn(DEADLINE_STATUSES)
  deadlineStatus?: DeadlineStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value != null)
  @IsDateString()
  completedAt?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantIds?: string[];
}
