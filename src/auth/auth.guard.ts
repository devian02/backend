import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {

  constructor(private jwtService: JwtService, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    // If no token is provided, throw an error
    if (!token) {
      throw new UnauthorizedException({ message: 'Please authenticate to access this resource.'});
    }

    try {

      // Verify the token and extract the user ID
      const payload = await this.jwtService.verifyAsync(
        token,
        {
          secret: process.env.JWT_SECRET,
        }
      );

      // Find the user in the database
      const user = await this.prisma.user.findUnique({
        where: {
          id: payload['sub'],
        },
        select: {
          id: true,
          name: true,
          email: true,
          ethAddress: true,
          createdAt: true,
        }
      });

      // If the user is not found, throw an error
      if (!user) {
        throw new UnauthorizedException({ message: 'Invalid session. Please sign in again.'});
      }
      // Attach the user object to the request
      request['user'] = user;

    } catch {
      // If the token is invalid, throw an error
      throw new UnauthorizedException({ message: 'Session expired. Please sign in again.'});
    }

    return true;
  }

  // Extract the token from the Authorization header
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}