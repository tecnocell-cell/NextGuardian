import { Body, Controller, Header, HttpCode, Post } from '@nestjs/common';
import { ActivationService } from './activation.service.js';
import { validateActivationSchema } from './activation.dto.js';
import { parseBody } from '../../shared/http/validation.js';

@Controller()
export class ActivationController {
  constructor(private readonly activation: ActivationService) {}

  @Post('activation/validate')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  validate(@Body() body: unknown) {
    return this.activation.validate(parseBody(validateActivationSchema, body));
  }
}
