import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator"

export class DevLoginDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string

  @IsEmail()
  email: string
}
