import { BadRequestException, Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';
import { SignInDto } from './dto/sign-in.dto';
import { AuthGuard } from './auth.guard';
import { BlockchainService } from 'src/blockchain/blockchain.service';
import { User } from 'src/users/entities/user.entity';
import { JwtResponse } from './entities/auth.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private usersService:UsersService, private blockchainService: BlockchainService) {}

  @Post('signUp')
  async signUp(@Body() createUserDto: CreateUserDto): Promise<JwtResponse> {

    // Check if the email or name is already in use
    if (await this.usersService.findOneByEmail(createUserDto.email)) {
      throw new BadRequestException('The email is already in use.');
    }

    if (await this.usersService.findOneByName(createUserDto.name)) {
      throw new BadRequestException('The name is already in use.');
    }


    return this.authService.signUp(createUserDto);
  }

  @Post('signIn')
  signIn(@Body() signInDto: SignInDto): Promise<JwtResponse> {
    return this.authService.signIn(signInDto);
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {

    // Get user's balance
    const balance = parseInt((await this.blockchainService.getBalance(req.user.ethAddress)).toString());

    // Get user's profile
    const user = await this.usersService.findProfile(req.user.id);

    // Return the user's profile with the balance
    return {...user, balance};
  }

}
