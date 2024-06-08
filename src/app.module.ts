import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BlockchainService } from './blockchain/blockchain.service';
import { IpsModule } from './ips/ips.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    IpsModule,
  ],
  controllers: [AppController],
  providers: [AppService, BlockchainService],
})
export class AppModule {}
