import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export interface CliOptions {
  command: 'all-time' | 'daily' | 'monthly' | 'today';
  since?: string;
  until?: string;
  tz?: string;
  groupBy?: 'day' | 'month' | 'all-time' | 'today';
  metrics?: string[];
  path?: string[];
  project?: string;
  json?: boolean;
  csv?: boolean;
  concurrency?: number;
  tokenLimit?: number;
}

export function parseArgs(argv: string[]): CliOptions {
  const parser = yargs(hideBin(argv))
    .scriptName('cushare')
    .usage('$0 <command> [options]')
    .command('all-time', 'Show all-time usage statistics', {
      since: {
        type: 'string',
        description: 'Start date (ISO format or YYYY-MM-DD)',
      },
      until: {
        type: 'string',
        description: 'End date (ISO format or YYYY-MM-DD)',
      },
      tz: {
        type: 'string',
        description: 'Timezone for date filtering',
        default: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      metrics: {
        type: 'string',
        description: 'Comma-separated metrics to show (tokens,prompts,time)',
        default: 'tokens,prompts,time',
      },
      path: {
        type: 'array',
        description: 'Custom log file paths (can be repeated)',
        string: true,
      },
      project: {
        type: 'string',
        description: 'Filter by project name/path substring',
      },
      json: {
        type: 'boolean',
        description: 'Output JSON instead of table',
        default: false,
      },
      csv: {
        type: 'boolean',
        description: 'Output CSV instead of table',
        default: false,
      },
      concurrency: {
        type: 'number',
        description: 'Number of files to process concurrently',
        default: 10,
      },
    })
    .command('daily', 'Show daily usage statistics', {
      since: {
        type: 'string',
        description: 'Start date (ISO format or YYYY-MM-DD)',
        demandOption: true,
      },
      until: {
        type: 'string',
        description: 'End date (ISO format or YYYY-MM-DD)',
        demandOption: true,
      },
      tz: {
        type: 'string',
        description: 'Timezone for date filtering',
        default: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      metrics: {
        type: 'string',
        description: 'Comma-separated metrics to show (tokens,prompts,time)',
        default: 'tokens,prompts,time',
      },
      path: {
        type: 'array',
        description: 'Custom log file paths (can be repeated)',
        string: true,
      },
      project: {
        type: 'string',
        description: 'Filter by project name/path substring',
      },
      json: {
        type: 'boolean',
        description: 'Output JSON instead of table',
        default: false,
      },
      csv: {
        type: 'boolean',
        description: 'Output CSV instead of table',
        default: false,
      },
      concurrency: {
        type: 'number',
        description: 'Number of files to process concurrently',
        default: 10,
      },
    })
    .command('monthly', 'Show monthly usage statistics', {
      since: {
        type: 'string',
        description: 'Start date (ISO format or YYYY-MM-DD)',
      },
      until: {
        type: 'string',
        description: 'End date (ISO format or YYYY-MM-DD)',
      },
      tz: {
        type: 'string',
        description: 'Timezone for date filtering',
        default: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      metrics: {
        type: 'string',
        description: 'Comma-separated metrics to show (tokens,prompts,time)',
        default: 'tokens,prompts,time',
      },
      path: {
        type: 'array',
        description: 'Custom log file paths (can be repeated)',
        string: true,
      },
      project: {
        type: 'string',
        description: 'Filter by project name/path substring',
      },
      json: {
        type: 'boolean',
        description: 'Output JSON instead of table',
        default: false,
      },
      csv: {
        type: 'boolean',
        description: 'Output CSV instead of table',
        default: false,
      },
      concurrency: {
        type: 'number',
        description: 'Number of files to process concurrently',
        default: 10,
      },
    })
    .command('today', 'Show today\'s usage and current session status', {
      tz: {
        type: 'string',
        description: 'Timezone for date filtering',
        default: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      path: {
        type: 'array',
        description: 'Custom log file paths (can be repeated)',
        string: true,
      },
      project: {
        type: 'string',
        description: 'Filter by project name/path substring',
      },
      json: {
        type: 'boolean',
        description: 'Output JSON instead of table',
        default: false,
      },
      'token-limit': {
        type: 'number',
        description: 'Token limit for session tracking (defaults to max usage)',
        alias: 't',
      },
    })
    .help()
    .alias('help', 'h')
    .version('1.0.0')
    .alias('version', 'v')
    .strict()
    .demandCommand(1, 'You must specify a command');

  const args = parser.parseSync();
  
  const command = args._[0] as 'all-time' | 'daily' | 'monthly' | 'today';
  
  return {
    command,
    since: args.since as string | undefined,
    until: args.until as string | undefined,
    tz: args.tz as string | undefined,
    groupBy: command === 'daily' ? 'day' : command === 'monthly' ? 'month' : command === 'today' ? 'today' : 'all-time',
    metrics: typeof args.metrics === 'string' ? args.metrics.split(',') : ['tokens', 'prompts', 'time'],
    path: args.path as string[] | undefined,
    project: args.project as string | undefined,
    json: args.json as boolean | undefined,
    csv: args.csv as boolean | undefined,
    concurrency: (args.concurrency as number) || 10,
    tokenLimit: args['token-limit'] as number | undefined,
  };
}