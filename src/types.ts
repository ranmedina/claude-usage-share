import { z } from 'zod';

export const RawEventSchema = z.object({
  // Standard timestamp fields
  ts: z.string().optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
  created_at: z.string().optional(),
  
  // Standard model fields
  model: z.string().optional(),
  model_name: z.string().optional(),
  meta: z.object({
    model: z.string().optional(),
  }).optional(),
  
  // Standard token fields
  tokens_in: z.number().optional(),
  input_tokens: z.number().optional(),
  tokens_out: z.number().optional(),
  output_tokens: z.number().optional(),
  usage: z.object({
    input_tokens: z.number().optional(),
    prompt_tokens: z.number().optional(),
    output_tokens: z.number().optional(),
    completion_tokens: z.number().optional(),
  }).optional(),
  
  // Duration fields
  latency_ms: z.number().optional(),
  duration_ms: z.number().optional(),
  
  // Session/project fields
  session_id: z.string().optional(),
  conversation_id: z.string().optional(),
  sessionId: z.string().optional(), // Claude Code format
  project: z.string().optional(),
  workspace: z.string().optional(),
  repo_path: z.string().optional(),
  cwd: z.string().optional(),
  
  // Event type
  event: z.string().optional(),
  type: z.string().optional(), // Claude Code format
  
  // Claude Code specific fields
  message: z.object({
    role: z.string().optional(),
    model: z.string().optional(),
    usage: z.object({
      input_tokens: z.number().optional(),
      cache_creation_input_tokens: z.number().optional(),
      cache_read_input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
    }).optional(),
  }).optional(),
}).passthrough();

export type RawEvent = z.infer<typeof RawEventSchema>;

export interface NormalizedEvent {
  timestamp: Date;
  model: string;
  tokensIn: number;
  tokensOut: number;
  tokensTotal: number;
  durationMs?: number;
  sessionId?: string;
  project?: string;
}

export type ModelBucket = 'Opus' | 'Sonnet' | 'Other';

export interface ModelStats {
  tokens: number;
  tokensIn: number;
  tokensOut: number;
  prompts: number;
  durationMs: number;
  pctTokens: number;
  pctPrompts: number;
  pctTime: number;
  costUSD?: number;
  costInput?: number;
  costOutput?: number;
}

export interface UsageReport {
  window: {
    since?: string;
    until?: string;
    tz: string;
  };
  grouping: 'all-time' | 'day' | 'month' | 'today';
  totals: {
    tokens: number;
    prompts: number;
    durationMs: number;
  };
  models: Record<ModelBucket, ModelStats>;
}

export interface ParseOptions {
  since?: Date;
  until?: Date;
  projectFilter?: string;
  timezone?: string;
}

export interface StreamStats {
  totalLines: number;
  validEvents: number;
  skippedLines: number;
  errors: number;
}

export interface AggregationOptions {
  groupBy?: 'all-time' | 'day' | 'month' | 'today';
  timezone?: string;
  since?: Date;
  until?: Date;
}