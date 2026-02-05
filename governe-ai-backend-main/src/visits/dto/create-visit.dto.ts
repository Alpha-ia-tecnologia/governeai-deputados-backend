import { IsString, IsOptional, IsDateString, IsArray, ValidateNested, IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVisitDto {
  @IsString()
  @IsNotEmpty()
  voterId: string;

  @IsString()
  @IsOptional()
  leaderId?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsDateString()
  @IsOptional()
  date?: Date;

  @IsString()
  @IsNotEmpty()
  objective: string;

  @IsString()
  @IsOptional()
  result?: string;

  @IsString()
  @IsOptional()
  nextSteps?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  photos?: string[];

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;
}

