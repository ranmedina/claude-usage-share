import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { RawEventSchema, type RawEvent, type NormalizedEvent, type ModelBucket, type ParseOptions, type StreamStats } from './types.js';

export function normalizeModel(model: string): ModelBucket {
  const lower = model.toLowerCase();
  if (lower.includes('opus')) return 'Opus';
  if (lower.includes('sonnet')) return 'Sonnet';
  return 'Other';
}

export function extractTimestamp(raw: RawEvent): Date | null {
  const ts = raw.ts || raw.timestamp || raw.created_at;
  if (!ts) return null;
  
  if (typeof ts === 'number') {
    return new Date(ts);
  }
  
  if (typeof ts === 'string') {
    const parsed = new Date(ts);
    if (isNaN(parsed.getTime())) return null;
    return parsed;
  }
  
  return null;
}

function extractModel(raw: RawEvent): string | null {
  // Claude Code format: message.model
  if (raw.message?.model) return raw.message.model;
  
  // Standard formats
  return raw.model || raw.model_name || raw.meta?.model || null;
}

export function extractTokens(raw: RawEvent): { tokensIn: number; tokensOut: number } {
  // Claude Code format: message.usage
  if (raw.message?.usage) {
    const tokensIn = (raw.message.usage.input_tokens || 0) + 
                     (raw.message.usage.cache_creation_input_tokens || 0) + 
                     (raw.message.usage.cache_read_input_tokens || 0);
    const tokensOut = raw.message.usage.output_tokens || 0;
    return { tokensIn, tokensOut };
  }
  
  // Standard formats
  const tokensIn = raw.tokens_in || 
                   raw.input_tokens || 
                   raw.usage?.input_tokens || 
                   raw.usage?.prompt_tokens || 
                   0;
  
  const tokensOut = raw.tokens_out || 
                    raw.output_tokens || 
                    raw.usage?.output_tokens || 
                    raw.usage?.completion_tokens || 
                    0;
  
  return { tokensIn, tokensOut };
}

function extractDuration(raw: RawEvent): number | undefined {
  return raw.latency_ms || raw.duration_ms;
}

function extractSessionId(raw: RawEvent): string | undefined {
  // Claude Code format: sessionId
  if (raw.sessionId) return raw.sessionId;
  
  // Standard formats
  return raw.session_id || raw.conversation_id;
}

function extractProject(raw: RawEvent): string | undefined {
  return raw.project || raw.workspace || raw.repo_path || raw.cwd;
}

export function isValidEvent(raw: RawEvent): boolean {
  const model = extractModel(raw);
  const { tokensIn, tokensOut } = extractTokens(raw);
  const timestamp = extractTimestamp(raw);
  
  // For Claude Code format, only count assistant messages with usage data
  if (raw.type === 'assistant' && raw.message?.role === 'assistant' && raw.message?.usage) {
    return !!(model && (tokensIn > 0 || tokensOut > 0) && timestamp);
  }
  
  // For standard formats
  return !!(model && (tokensIn > 0 || tokensOut > 0 || raw.event === 'completion') && timestamp);
}

export function normalizeEvent(raw: RawEvent): NormalizedEvent | null {
  if (!isValidEvent(raw)) return null;
  
  const timestamp = extractTimestamp(raw)!;
  const model = extractModel(raw)!;
  const { tokensIn, tokensOut } = extractTokens(raw);
  const durationMs = extractDuration(raw);
  const sessionId = extractSessionId(raw);
  const project = extractProject(raw);
  
  return {
    timestamp,
    model: normalizeModel(model),
    tokensIn,
    tokensOut,
    tokensTotal: tokensIn + tokensOut,
    durationMs,
    sessionId,
    project,
  };
}

function withinWindow(timestamp: Date, options: ParseOptions): boolean {
  if (options.since && timestamp < options.since) return false;
  if (options.until && timestamp > options.until) return false;
  return true;
}

function matchesProject(project: string | undefined, filter: string | undefined): boolean {
  if (!filter) return true;
  if (!project) return false;
  return project.toLowerCase().includes(filter.toLowerCase());
}

export async function* streamJsonlEvents(
  filePath: string, 
  options: ParseOptions = {}
): AsyncGenerator<NormalizedEvent, StreamStats> {
  const stats: StreamStats = {
    totalLines: 0,
    validEvents: 0,
    skippedLines: 0,
    errors: 0,
  };
  
  const fileStream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  
  for await (const line of rl) {
    stats.totalLines++;
    
    if (!line.trim()) {
      stats.skippedLines++;
      continue;
    }
    
    try {
      const rawJson = JSON.parse(line);
      const rawEvent = RawEventSchema.parse(rawJson);
      const normalized = normalizeEvent(rawEvent);
      
      if (!normalized) {
        stats.skippedLines++;
        continue;
      }
      
      if (!withinWindow(normalized.timestamp, options)) {
        stats.skippedLines++;
        continue;
      }
      
      if (!matchesProject(normalized.project, options.projectFilter)) {
        stats.skippedLines++;
        continue;
      }
      
      stats.validEvents++;
      yield normalized;
      
    } catch (error) {
      stats.errors++;
      // Log parsing errors but continue processing other lines
      if (stats.errors > 100) {
        throw new Error(`Too many parsing errors (${stats.errors}) in log file. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      continue;
    }
  }
  
  return stats;
}