import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SettleShareDto {
  @ApiProperty()
  @IsBoolean()
  settled!: boolean;
}
