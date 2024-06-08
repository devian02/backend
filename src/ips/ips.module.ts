import { Module } from '@nestjs/common';
import { IpsService } from './ips.service';
import { IpsController } from './ips.controller';
import { PrismaService } from 'prisma/prisma.service';
import { BlockchainService } from 'src/blockchain/blockchain.service';
import { UsersService } from 'src/users/users.service';

@Module({
  controllers: [IpsController],
  providers: [IpsService, PrismaService, BlockchainService, UsersService],
})
export class IpsModule {}
