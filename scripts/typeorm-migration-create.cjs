const { spawnSync } = require('node:child_process');

const name = process.argv[2];

if (!name) {
  console.error('Usage: pnpm db:migration:create <MigrationName>');
  process.exit(1);
}

const migrationPath = name.includes('/')
  ? name
  : `src/database/migrations/${name}`;

const result = spawnSync(
  './node_modules/.bin/typeorm-ts-node-commonjs',
  ['-d', 'src/database/data-source.ts', 'migration:create', migrationPath],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
