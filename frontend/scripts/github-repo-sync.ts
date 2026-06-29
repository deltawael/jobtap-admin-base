import process from 'node:process';
import { parseArgs } from 'node:util';
import { syncRepositoryConfig } from './github-repo-sync-lib';

function printHelp() {
  console.log(`GitHub repository secrets/variables sync

Usage:
  pnpm github:sync
  pnpm github:sync -- --config ../github-repo-config/prod.local.yaml
  pnpm github:sync -- --config <path>
  pnpm github:sync -- --dry-run

Options:
  -c, --config <path>  Path to the YAML config file, for example ../github-repo-config/prod.local.yaml
  -d, --dry-run        Print the planned actions without sending changes to GitHub
  -h, --help           Show this help message
`);
}

async function main() {
  const args = process.argv.slice(2).filter(argument => argument !== '--');
  const { values } = parseArgs({
    args,
    options: {
      config: {
        type: 'string',
        short: 'c'
      },
      'dry-run': {
        type: 'boolean',
        short: 'd'
      },
      help: {
        type: 'boolean',
        short: 'h'
      }
    },
    allowPositionals: false
  });

  if (values.help) {
    printHelp();
    return;
  }

  await syncRepositoryConfig({
    configPath: values.config,
    dryRun: values['dry-run']
  });
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
