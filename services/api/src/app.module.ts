import { Module, type DynamicModule } from '@nestjs/common';
import { DatabaseModule } from './shared/db/database.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { WorkspacesModule } from './modules/workspaces/workspaces.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AccountModule } from './modules/account/account.module.js';
import { ActivationModule } from './modules/activation/activation.module.js';
import { DevicesModule } from './modules/devices/devices.module.js';
import { SubscriptionModule } from './modules/subscription/subscription.module.js';
@Module({})
export class AppModule {
  static register(databaseUrl?: string): DynamicModule {
    return {
      module: AppModule,
      imports: [
        DatabaseModule.forRoot(databaseUrl),
        HealthModule,
        WorkspacesModule.register(databaseUrl),
        AuthModule,
        AccountModule,
        ActivationModule,
        DevicesModule,
        SubscriptionModule,
      ],
    };
  }
}
