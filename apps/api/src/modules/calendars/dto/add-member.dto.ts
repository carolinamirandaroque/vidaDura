import { IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CalendarRole } from '@prisma/client';

export class AddMemberDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty({ enum: CalendarRole })
  @IsEnum(CalendarRole)
  role!: CalendarRole;
}
