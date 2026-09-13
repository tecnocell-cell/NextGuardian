import { Global, Module, type DynamicModule } from '@nestjs/common';
import { Database } from './database.js';

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(url?: string): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [{ provide: Database, useFactory: () => new Database(url) }],
      exports: [Database],
    };
  }
}
