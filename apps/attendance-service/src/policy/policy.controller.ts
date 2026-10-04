import { Controller, Get, Query } from '@nestjs/common';
import { WorkPolicyService } from './work-policy.service';
import { TimePolicyEngine } from './time-policy.engine';

@Controller('policies')
export class PolicyController {
  constructor(private readonly policyService: WorkPolicyService) {}

  @Get('current')
  async getCurrentPolicy() {
    const policy = await this.policyService.getActivePolicy();
    return { data: policy };
  }

  @Get('schedule')
  async getSchedule(@Query('date') dateStr?: string) {
    const date = dateStr ? new Date(`${dateStr}T12:00:00+07:00`) : new Date();
    const wib = TimePolicyEngine.getWibComponents(date);
    const [policy, holidays] = await Promise.all([
      this.policyService.getActivePolicy(),
      this.policyService.getHolidays(),
    ]);

    const { scheduleType, holiday } = TimePolicyEngine.classifySchedule(wib, policy, holidays);

    return {
      data: {
        date: wib.dateString,
        scheduleType,
        isWorkday: scheduleType === 'REGULAR_WORKDAY',
        checkInTime: policy.checkInTime,
        checkOutTime: policy.checkOutTime,
        cutoffTime: policy.cutoffTime,
        timezone: policy.timezone,
        holidayDescription: holiday?.description ?? null,
      },
    };
  }
}
