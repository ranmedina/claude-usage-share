# claude-usage-share

A privacy-first CLI tool that analyzes local Claude Code logs and reports **usage share by model** (Opus vs Sonnet) across tokens, prompts, and time for all Claude plans. Shows the API value of your usage to demonstrate subscription savings.

## Features

- **Privacy-first**: Runs entirely locally, no network calls or data uploads
- **Streaming processing**: Handles large log files without loading them into memory
- **Multi-format output**: Terminal tables, JSON, and CSV
- **Flexible time windows**: All-time, daily, monthly, and real-time today reporting with custom date ranges
- **Project filtering**: Filter usage by project/workspace
- **Duration estimation**: Smart estimation of request durations when not recorded
- **Robust parsing**: Handles various log formats and gracefully skips malformed entries
- **Real-time session tracking**: Monitor current Claude Code sessions with 5-hour billing window awareness
- **API value display**: Shows what your usage would cost on API pricing to highlight subscription savings

## Installation

```bash
npm install -g claude-usage-share
```

Or run directly with npx:

```bash
npx claude-usage-share all-time
```

## Why Use This Tool?

💡 **See Your Subscription Value**: Discover how your Claude subscription often provides hundreds or thousands of dollars worth of API usage!

📊 **Track Usage Patterns**: Monitor your Opus vs Sonnet usage to optimize your workflows

⏱️ **Real-time Monitoring**: Track active sessions within the 5-hour billing windows

🔒 **Complete Privacy**: All analysis happens locally - your usage data never leaves your machine

## Quick Start

```bash
# Show all-time usage summary
cushare all-time

# Show daily breakdown for a date range
cushare daily --since 2025-08-01 --until 2025-08-16

# Show monthly summary for a specific project
cushare monthly --project costguard

# Show today's usage with real-time session tracking
cushare today

# Monitor current session with token limit tracking
cushare today --token-limit 5000000

# Export to JSON
cushare all-time --json > usage.json

# Export to CSV
cushare all-time --csv > usage.csv
```

## Commands

### `cushare all-time [options]`

Shows aggregated usage statistics across all time (or within specified date range).

### `cushare daily [options]`

Shows daily usage breakdown. Requires `--since` and `--until` dates.

### `cushare monthly [options]`

Shows monthly usage breakdown.

### `cushare today [options]`

Shows today's usage with real-time session tracking. Monitors active Claude Code sessions within 5-hour billing windows, providing burn rate calculations and time remaining until session reset.

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--since <date>` | Start date (ISO format or YYYY-MM-DD) | - |
| `--until <date>` | End date (ISO format or YYYY-MM-DD) | - |
| `--tz <timezone>` | Timezone for date filtering | System timezone |
| `--metrics <list>` | Comma-separated metrics (tokens,prompts,time) | All metrics |
| `--path <dir>` | Custom log file paths (repeatable) | Auto-discover |
| `--project <filter>` | Filter by project name/path substring | - |
| `--json` | Output JSON instead of table | false |
| `--csv` | Output CSV instead of table | false |
| `--concurrency <n>` | Number of files to process concurrently | 10 |
| `--token-limit <n>` | Token limit for session tracking (today command) | Auto-detect |

## Log File Discovery

By default, the tool searches for `*.jsonl` and `*.log` files in:

**macOS:**
- `~/Library/Logs/Claude`
- `~/.claude/projects`

**Windows:**
- `%APPDATA%\Claude\logs`
- `%USERPROFILE%\.claude\projects`

**Linux:**
- `~/.claude/projects`
- `~/.config/claude/logs`

Use `--path <dir>` to specify custom search directories.

## Supported Log Formats

The tool parses JSONL files with these field variations:

### Timestamps
- `ts` (ISO 8601)
- `timestamp` (ISO 8601 or epoch milliseconds)
- `created_at` (ISO 8601)

### Models
- `model`
- `model_name`
- `meta.model`

### Token Counts
- `tokens_in` / `tokens_out`
- `input_tokens` / `output_tokens`
- `usage.input_tokens` / `usage.output_tokens`
- `usage.prompt_tokens` / `usage.completion_tokens`

### Duration (optional)
- `latency_ms`
- `duration_ms`

### Session/Project (optional)
- `session_id` / `conversation_id`
- `project` / `workspace` / `repo_path` / `cwd`

## Model Classification

Models are automatically classified into buckets:
- **Opus**: Models starting with "opus" (e.g., `opus-4.1`)
- **Sonnet**: Models starting with "sonnet" (e.g., `sonnet-4.1`)
- **Other**: All other models

## API Value Calculation

The tool shows what your usage would cost if you were using the API instead of your subscription. This helps you understand the value you're getting from your Claude subscription.

### Current API Pricing (August 2025)
- **Claude Opus 4.1**: $15/1M input tokens, $75/1M output tokens
- **Claude Sonnet 4**: $3/1M input tokens, $15/1M output tokens  
- **Claude Haiku 3.5**: $0.80/1M input tokens, $4/1M output tokens

**Important**: As a Claude subscriber, you pay a flat monthly fee with no per-token charges. The "API Value" shown is what you would have paid if using the API directly - helping you see how much value you're getting from your subscription!

## Duration Estimation

When duration data isn't available, the tool estimates request duration:

1. **With session IDs**: Calculates time between consecutive events in the same session (capped at 2 minutes)
2. **Without session IDs**: Groups events by project within 10-minute windows and applies the same logic
3. **Fallback**: Uses 30-second default for the last event in a group

## Example Output

### Today's Usage with API Value Display

```bash
$ cushare today

📅 Today's Usage Report (2025-08-16)
══════════════════════════════════════════════════

📊 Daily Totals:
   Tokens: 106,335,765
   Prompts: 1,793
   Duration: 00:00

🟠 Active Session (High Usage)
   ├─ Block Started: 20:16:10
   ├─ Time Remaining: 29m
   ├─ Burn Rate: 20,214 tokens/min
   ├─ Token Limit: 47,936,914
   ├─ Tokens Remaining: 9,832,088
   ├─ Projected Total: 38,702,966 tokens
   └─ Usage: [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░] 79.5%

✅ Completed Blocks Today: 2
   3:09:24: 47,936,914 tokens (21:37)
   12:55:27: 20,294,025 tokens (11:51)

🤖 Model Usage Breakdown:

   ⚡ Sonnet (Fast & Efficient)
   ├─ Tokens: 91,265,739 (85.8%)
   ├─ Prompts: 1,422
   ├─ Share: [█████████████████░░░] 85.8%
   └─ API Value: $276.23 (if using API instead of subscription)

   🧠 Opus (Premium Intelligence)
   ├─ Tokens: 15,070,026 (14.2%)
   ├─ Prompts: 371
   ├─ Share: [███░░░░░░░░░░░░░░░░░] 14.2%
   └─ API Value: $228.88 (if using API instead of subscription)

💰 Total API Value: $505.10
   (What this usage would cost with API pricing)
```

### All-Time Summary
```bash
$ cushare all-time

📊 All-Time Usage Summary
══════════════════════════════════════

Period: 2025-07-01 to 2025-08-16
Total Tokens: 456,789,012
Total Prompts: 8,432
Total Duration: 126h 40m

🤖 Model Distribution:

   ⚡ Sonnet (65.9%)
   ├─ Tokens: 301,124,089
   ├─ Prompts: 6,789
   └─ API Value: $912.45

   🧠 Opus (34.1%)
   ├─ Tokens: 155,664,923
   ├─ Prompts: 1,643
   └─ API Value: $2,361.82

💰 Total API Value: $3,274.27
   (What this usage would cost with API pricing)
```

### Terminal Table
```
┌─────────┬──────────┬──────────┬──────────┬──────────────────────────────────────┐
│ Model   │ Tokens % │ Prompts %│ Time %   │ Totals (tokens/prompts/time hh:mm)  │
├─────────┼──────────┼──────────┼──────────┼──────────────────────────────────────┤
│ Opus    │ 34.1%    │ 22.8%    │ 37.9%    │ 456,789 / 98 / 126:40               │
│ Sonnet  │ 65.9%    │ 77.2%    │ 62.1%    │ 882,345 / 331 / 207:15              │
│ Other   │ 0.0%     │ 0.0%     │ 0.0%     │ 0 / 0 / 00:00                        │
└─────────┴──────────┴──────────┴──────────┴──────────────────────────────────────┘
Max Plan share: Opus 34.1%, Sonnet 65.9% (by tokens).
```

### JSON Output
```json
{
  "window": {
    "since": "2025-08-01",
    "until": "2025-08-16",
    "tz": "UTC"
  },
  "grouping": "all-time",
  "totals": {
    "tokens": 1339134,
    "prompts": 429,
    "durationMs": 1202700000
  },
  "models": {
    "Opus": {
      "tokens": 456789,
      "prompts": 98,
      "durationMs": 456000000,
      "pctTokens": 34.1,
      "pctPrompts": 22.8,
      "pctTime": 37.9
    },
    "Sonnet": {
      "tokens": 882345,
      "prompts": 331,
      "durationMs": 745700000,
      "pctTokens": 65.9,
      "pctPrompts": 77.2,
      "pctTime": 62.1
    }
  }
}
```

## Examples

### Basic Usage
```bash
# All-time summary
cushare all-time

# Specific date range
cushare all-time --since 2025-08-01 --until 2025-08-15

# Daily breakdown
cushare daily --since 2025-08-01 --until 2025-08-07

# Today's usage with session tracking
cushare today
```

### Filtering and Formatting
```bash
# Filter by project
cushare all-time --project "costguard"

# Export formats
cushare all-time --json > report.json
cushare daily --since 2025-08-01 --until 2025-08-07 --csv > daily.csv

# Custom timezone
cushare all-time --tz "America/New_York"

# Monitor session with token limits
cushare today --token-limit 5000000 --tz "America/New_York"
```

### Custom Log Paths
```bash
# Single custom path
cushare all-time --path /custom/logs/dir

# Multiple paths
cushare all-time --path /logs1 --path /logs2
```

## Privacy & Security

- **No network access**: Tool runs entirely offline
- **No data collection**: No telemetry or usage tracking
- **Content privacy**: Only extracts metadata (tokens, model, timing); never reads actual prompt content
- **Local processing**: All analysis happens on your machine

## Limitations

- **Estimates only**: Duration and usage percentages are estimates, not billing-accurate data
- **Log dependency**: Accuracy depends on completeness of local Claude Code logs
- **Model detection**: Relies on model name patterns; new model names may be classified as "Other"
- **Memory usage**: While streaming, some data is kept in memory for duration estimation
- **Session tracking**: Real-time session monitoring is based on 5-hour billing windows and may not reflect exact Claude Code internal limits

## Development

### Prerequisites
- Node.js 18+
- npm 7+

### Building
```bash
npm install
npm run build
```

### Testing
```bash
npm test
npm run test:watch
```

### Project Structure
```
src/
├── parser.ts         # Streaming JSONL parser and event normalization
├── aggregator.ts     # Usage data aggregation and statistics
├── session-tracker.ts # Real-time session tracking and billing windows
├── formats.ts        # Output formatters (table, JSON, CSV)
├── cli-parser.ts     # Command-line argument parsing
├── cli.ts           # Main CLI entry point
├── discovery.ts     # Log file discovery across platforms
├── duration.ts      # Duration estimation for events
└── types.ts         # TypeScript type definitions
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/ranmedina/claude-usage-share/issues).