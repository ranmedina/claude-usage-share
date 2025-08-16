# Claude Usage Share (cushare) - Library Brief

## Overview

**claude-usage-share** (command: `cushare`) is a privacy-first TypeScript CLI tool that analyzes local Claude Code logs to provide detailed usage analytics and real-time session tracking. It helps all Claude plan users understand their usage patterns across different AI models (Opus vs Sonnet) and monitor current sessions within Claude Code's 5-hour billing windows.

## Key Features

### 📊 Usage Analytics
- **Model usage breakdown**: Analyze token, prompt, and time distribution across Opus, Sonnet, and other models
- **Multiple time windows**: All-time, daily, monthly, and real-time today reports
- **Flexible date ranges**: Custom time periods with timezone support
- **Project filtering**: Focus on specific workspaces or projects

### ⏱️ Real-time Session Tracking  
- **5-hour billing window awareness**: Aligns with Claude Code's actual billing structure
- **Burn rate calculation**: Tokens per minute usage tracking
- **Time remaining**: Shows how much time is left in current session block
- **Token limit monitoring**: Set custom limits with progress indicators and warnings
- **Projected usage**: Estimates total session usage based on current burn rate

### 🔒 Privacy-First Design
- **100% local processing**: No network calls or data uploads
- **Content privacy**: Only extracts metadata (tokens, model, timing) - never reads prompt content
- **Streaming processing**: Handles large log files without loading into memory
- **No telemetry**: Zero usage tracking or data collection

### 📁 Output Formats
- **Rich terminal tables**: Color-coded progress bars and emojis
- **JSON export**: Machine-readable structured data
- **CSV export**: Spreadsheet-compatible format

## Technical Architecture

### Core Components

1. **Parser** (`src/parser.ts`)
   - Streaming JSONL parser with robust error handling
   - Supports multiple log field variations (timestamps, tokens, models)
   - Graceful handling of malformed entries

2. **Session Tracker** (`src/session-tracker.ts`)
   - Implements 5-hour billing window logic
   - Calculates burn rates and time remaining
   - Groups events into session blocks for real-time monitoring

3. **Discovery** (`src/discovery.ts`)
   - Auto-discovers Claude Code log files across platforms
   - Supports custom log paths
   - Platform-specific default locations (macOS, Windows, Linux)

4. **Aggregator** (`src/aggregator.ts`)
   - Groups and aggregates usage data by time periods
   - Calculates percentages and model distribution
   - Handles duration estimation when not recorded

5. **Formatters** (`src/formats.ts`)
   - Rich console output with progress bars and color coding
   - JSON and CSV export capabilities
   - Responsive table layouts

### CLI Commands

```bash
# Show all-time usage summary
cushare all-time

# Show daily breakdown for date range  
cushare daily --since 2025-08-01 --until 2025-08-16

# Show monthly summary
cushare monthly

# Real-time session tracking with today's usage
cushare today

# Monitor with token limits and warnings
cushare today --token-limit 5000000
```

### Log File Support

**Supported formats**: JSONL files with flexible field mapping
**Auto-discovery paths**:
- macOS: `~/Library/Logs/Claude`, `~/.claude/projects`
- Windows: `%APPDATA%\Claude\logs`, `%USERPROFILE%\.claude\projects`  
- Linux: `~/.claude/projects`, `~/.config/claude/logs`

**Field variations supported**:
- Timestamps: `ts`, `timestamp`, `created_at`
- Models: `model`, `model_name`, `meta.model`
- Tokens: `tokens_in/out`, `input_tokens/output_tokens`, `usage.*`
- Sessions: `session_id`, `conversation_id`, `project`, `workspace`

## Use Cases

### For Individual Users
- **Daily quota monitoring**: Track usage against personal limits
- **Model preference analysis**: Understand which models you use most
- **Cost optimization**: Identify high-usage patterns
- **Session management**: Avoid hitting 5-hour billing window limits

### For Teams/Organizations  
- **Usage reporting**: Generate reports for billing and planning
- **Project tracking**: Analyze usage by workspace/project
- **Historical analysis**: Long-term usage trend identification
- **Resource planning**: Understand peak usage periods

### For Developers
- **API integration**: Use as a library for custom analytics
- **Data export**: CSV/JSON output for further analysis
- **Extensible architecture**: Add custom formatters or aggregators

## Recent Major Feature: Real-time Session Tracking

The latest major addition is the `cushare today` command, which provides:

- **Live session monitoring**: Shows current active session status within 5-hour blocks
- **Intelligent limit detection**: Auto-detects token limits from usage patterns
- **Visual progress indicators**: Color-coded progress bars (🟢 low, 🟡 medium, 🔴 high usage)
- **Burn rate analytics**: Real-time tokens-per-minute calculations
- **Projection capabilities**: Estimates total session usage based on current rate

This feature addresses the need for real-time usage awareness, helping users optimize their Claude Code sessions and avoid unexpected limits.

## Installation & Usage

```bash
# Install globally
npm install -g claude-usage-share

# Or run directly
npx claude-usage-share today

# Quick usage examples
cushare all-time --json > usage-report.json
cushare today --token-limit 10000000
cushare daily --since 2025-08-01 --until 2025-08-16 --project myapp
```

## Development Standards

- **TypeScript**: Full type safety with strict mode
- **Testing**: Vitest with comprehensive unit tests
- **Linting**: ESLint with TypeScript rules
- **Build**: Single-step TypeScript compilation
- **Error handling**: Meaningful CLI error messages
- **Performance**: Streaming processing for large datasets

## Publishing Readiness

✅ **Code quality**: Linted and tested  
✅ **Documentation**: Comprehensive README with examples  
✅ **Package structure**: Proper npm package with bin entry  
✅ **Error handling**: CLI-appropriate error messages  
✅ **Type safety**: Full TypeScript coverage  
✅ **Build system**: Automated build and test scripts  

The library is ready for npm publishing and production use.