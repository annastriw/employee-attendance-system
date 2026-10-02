import { Module } from '@nestjs/common';
import { WorkPolicyService } from './work-policy.service';
import { PolicyController } from './policy.controller';

@Module({
  controllers: [PolicyController],
  providers: [WorkPolicyService],
  exports: [WorkPolicyService],
})
export class PolicyModule {}
