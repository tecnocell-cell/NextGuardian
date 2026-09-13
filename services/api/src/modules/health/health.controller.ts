import { Controller, Get, Header } from '@nestjs/common';
import { HealthService } from './health.service.js';
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  getHealth() { return this.health.status(); }
}
