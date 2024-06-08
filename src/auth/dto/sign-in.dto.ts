import { IsNotEmpty } from 'class-validator';

export class SignInDto {
  @IsNotEmpty({ message: 'Username or email is required'  })
  user: string;

  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
