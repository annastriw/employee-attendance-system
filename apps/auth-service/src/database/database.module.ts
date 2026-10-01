import { Global, Module } from '@nestjs/common';
import { AuthConfig } from '../config/auth.config';
import { DatabaseService } from './database.service';

@Global()
@Module({ providers: [AuthConfig, DatabaseService], exports: [AuthConfig, DatabaseService] })
export class DatabaseModule {}
