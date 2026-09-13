import { Module, type DynamicModule } from '@nestjs/common';
import { WorkspaceDatabase } from './workspace.database.js';
import { WorkspaceRepository } from './workspace.repository.js';

@Module({})
export class WorkspacesModule {
  static register(databaseUrl?: string): DynamicModule {
    return {
      module: WorkspacesModule,
      providers: [
        { provide: WorkspaceDatabase, useFactory: () => new WorkspaceDatabase(databaseUrl) },
        WorkspaceRepository,
      ],
      exports: [WorkspaceRepository],
    };
  }
}
