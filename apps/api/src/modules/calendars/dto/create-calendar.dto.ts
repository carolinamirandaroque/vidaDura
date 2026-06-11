import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCalendarDto {
  @ApiProperty({ example: 'Pessoal' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ example: '#6366f1' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
