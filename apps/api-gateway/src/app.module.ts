import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GatewayConfig } from './gateway.config';
import { AuthProxyService } from './auth-proxy.service';
import { AuthProxyController } from './auth-proxy.controller';

@Module({
  controllers: [AppController, AuthProxyController],
  providers: [AppService, GatewayConfig, AuthProxyService],
})
export class AppModule {}
