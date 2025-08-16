#!/usr/bin/env node

import { parseArgs, type CliOptions } from './cli-parser.js';
import { analyzeUsage } from './index.js';
import { formatTable, formatJson, formatCsv, formatTodayReport, formatTodayJson } from './formats.js';
import { generateTodayUsageReport } from './session-tracker.js';
import { discoverLogFiles } from './discovery.js';
import { streamJsonlEvents } from './parser.js';

async function main() {
  try {
    const options = parseArgs(process.argv);
    
    // Handle today command separately
    if (options.command === 'today') {
      await handleTodayCommand(options);
      return;
    }
    
    // Parse dates for other commands
    const parseOptions = {
      since: options.since ? parseDate(options.since, options.tz!) : undefined,
      until: options.until ? parseDate(options.until, options.tz!) : undefined,
      projectFilter: options.project,
      timezone: options.tz,
    };
    
    const aggregationOptions = {
      groupBy: options.groupBy,
      timezone: options.tz,
      since: parseOptions.since,
      until: parseOptions.until,
    };
    
    // Analyze usage
    console.error('Analyzing Claude usage logs...');
    const result = await analyzeUsage(
      options.path,
      parseOptions,
      aggregationOptions
    );
    
    // Format output
    if (options.json) {
      console.log(formatJson(result));
    } else if (options.csv) {
      console.log(formatCsv(result));
    } else {
      console.log(formatTable(result));
    }
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function handleTodayCommand(options: CliOptions) {
  console.error('Analyzing today\'s Claude usage...');
  
  try {
    // Discover log files
    const logFiles = await discoverLogFiles(options.path);
    
    if (logFiles.length === 0) {
      throw new Error('No Claude Code log files found. Please ensure Claude Code has been used and logs are available.');
    }
  
  // Collect all events
  const allEvents = [];
  
  for (const filePath of logFiles) {
    try {
      const eventStream = streamJsonlEvents(filePath, {
        projectFilter: options.project,
        timezone: options.tz,
      });
      
      for await (const event of eventStream) {
        allEvents.push(event);
      }
    } catch (error) {
      console.warn(`Failed to parse ${filePath}:`, error);
      continue;
    }
  }
  
  if (allEvents.length === 0) {
    throw new Error('No valid events found in log files');
  }
  
  // Generate today's usage report
  const report = generateTodayUsageReport(
    allEvents,
    options.tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
    options.tokenLimit
  );
  
  // Format output
  if (options.json) {
    console.log(formatTodayJson(report));
  } else {
    console.log(formatTodayReport(report));
  }
  
  } catch (error) {
    throw new Error(`Failed to analyze today's usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseDate(dateStr: string, _timezone: string): Date {
  // Try parsing as ISO string first
  let date = new Date(dateStr);
  
  // If that fails, try parsing as YYYY-MM-DD
  if (isNaN(date.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      date = new Date(`${dateStr}T00:00:00`);
    } else {
      throw new Error(`Invalid date format: ${dateStr}. Use ISO format or YYYY-MM-DD.`);
    }
  }
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  
  // For now, just return the date as-is (timezone handling can be improved later)
  return date;
}

if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}