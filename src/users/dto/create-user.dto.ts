import { IsEmail, IsNotEmpty, IsStrongPassword } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Invalid email' })
  email: string;

  @IsStrongPassword({minLength: 8, minSymbols: 1, minUppercase: 1, minNumbers: 1, minLowercase: 1}, { message: 'Password is too weak' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @IsNotEmpty({ message: 'Username is required'  })
  name: string;
}
