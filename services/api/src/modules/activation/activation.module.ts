import { Module } from '@nestjs/common';
import { ActivationController } from './activation.controller.js';
import { ActivationService } from './activation.service.js';
import { ActivationRepository } from './activation.repository.js';

@Module({ controllers: [ActivationController], providers: [ActivationService, ActivationRepository] })
export class ActivationModule {}
