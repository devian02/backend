import { Transform } from "class-transformer";
import { IsDecimal, IsNotEmpty, IsNumber, IsNumberString, MaxLength, Min, MinLength } from "class-validator";

export class CreateIpDto {

  @MaxLength(50, { message: 'Name is too long' })
  @MinLength(3, { message: 'Name is too short' })
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @MaxLength(5000, { message: 'Description is too long' })
  @MinLength(3, { message: 'Description is too short' })
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price must be greater than 0' })
  @IsNotEmpty({ message: 'Price is required' })
  @Transform(({ value }) => parseFloat(value))
  price: string;
}
