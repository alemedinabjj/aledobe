import { IsHexColor, IsObject, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from "class-validator"

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string

  @IsOptional()
  @IsHexColor()
  color?: string
}

export class CreateFileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsObject()
  document?: Record<string, unknown> | null
}

export class UpdateFileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsObject()
  document?: Record<string, unknown> | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  thumbnail?: string | null
}
