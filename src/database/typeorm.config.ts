import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import * as path from 'path';

function parseBoolean(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return value === 'true';
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function resolveRuntimeDir(): 'src' | 'dist' {
  return __filename.endsWith('.ts') ? 'src' : 'dist';
}

function buildGlob(relativePath: string): string {
  return path.join(process.cwd(), relativePath).replace(/\\/g, '/');
}

export function createTypeOrmOptions(
  env: NodeJS.ProcessEnv = process.env,
): TypeOrmModuleOptions & DataSourceOptions {
  const runtimeDir = resolveRuntimeDir();

  return {
    type: 'mysql',
    host: env.DB_HOST,
    port: parseNumber(env.DB_PORT, 3306),
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    entities: [buildGlob(`${runtimeDir}/**/*.entity{.ts,.js}`)],
    migrations: [buildGlob(`${runtimeDir}/database/migrations/*{.ts,.js}`)],
    migrationsTableName: 'typeorm_migrations',
    synchronize: parseBoolean(env.DB_SYNCHRONIZE, false),
    logging: parseBoolean(env.DB_LOGGING, true),
  };
}
