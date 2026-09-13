import { Injectable } from '@nestjs/common';
@Injectable()
export class HealthService {
  status(): { status: 'ok' } { return { status: 'ok' }; }
}
