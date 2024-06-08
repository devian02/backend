import { InternalServerErrorException, Injectable, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'prisma/prisma.service';
import { BlockchainService } from 'src/blockchain/blockchain.service';
import { JwtService } from '@nestjs/jwt';
import { SignInDto } from './dto/sign-in.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private blockchainService: BlockchainService,
    private jwtService: JwtService
  ) {}

  async signUp(userDto: CreateUserDto) {

    // Hash the password (10 rounds of salt)
    const hashedPassword = await bcrypt.hash(userDto.password, 10)

    // Create an Ethereum account (on the testnet)
    const ethAccount = await this.blockchainService.createAccount().catch((error) => {
      throw new InternalServerErrorException('An unexpected error occurred while creating your account. Please try again. (Code: 1)');
    });

    // Create the user in the database
    const user = await this.prisma.user.create({
      data: {
        ...userDto,
        password: hashedPassword,
        ethAddress: ethAccount.address,
        ethPrivateKey: ethAccount.privateKey
      }
    });

    // Generate a JWT token
    return {token: await this.jwtService.sign({ sub: user.id })};

  }

  async signIn(signInDto: SignInDto) {

    // Find the user by email or name
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          {
            email: signInDto.user
          },
          {
            name: signInDto.user
          }
        ]
      }
    });

    // Check if the user exists
    if (!user) {
      throw new BadRequestException('The credentials are invalid.');
    }

    // Check the password
    const validPassword = await bcrypt.compare(signInDto.password, user.password);

    // Check if the password is correct
    if (!validPassword) {
      throw new BadRequestException('The credentials are invalid.');
    }

    // Generate a JWT token
    return {token: await this.jwtService.sign({ sub: user.id })};

  }

}
