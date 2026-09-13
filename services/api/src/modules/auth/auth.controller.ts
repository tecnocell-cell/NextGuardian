import { Body, Controller, Header, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { loginSchema, registerSchema } from './auth.dto.js';
import { parseBody } from '../../shared/http/validation.js';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('auth/register')
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  register(@Body() body: unknown) {
    return this.auth.register(parseBody(registerSchema, body));
  }

  @Post('auth/login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  login(@Body() body: unknown) {
    return this.auth.login(parseBody(loginSchema, body));
  }
}
