import { NormalizedEvent } from './types.js';
import { calculateCost } from './pricing.js';

export interface SessionBlock {
  id: string;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  events: NormalizedEvent[];
  tokenCounts: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    totalTokens: number;
  };
  models: string[];
  costUSD?: number;
}

export interface TodayUsageReport {
  date: string;
  timezone: string;
  totalUsage: {
    tokens: number;
    prompts: number;
    durationMs: number;
  };
  activeSession?: {
    blockId: string;
    startTime: Date;
    timeRemaining: string;
    tokensUsed: number;
    burnRate: number; // tokens per minute
    tokenLimit?: number;
    usagePercent?: number;
    projectedTotal?: number;
  };
  completedBlocks: SessionBlock[];
  models: Record<string, {
    tokens: number;
    tokensIn: number;
    tokensOut: number;
    prompts: number;
    costUSD: number;
    costInput: number;
    costOutput: number;
  }>;
}

const BLOCK_DURATION_MS = 5 * 60 * 60 * 1000; // 5 hours in milliseconds

export function groupEventsIntoBlocks(events: NormalizedEvent[]): SessionBlock[] {
  if (events.length === 0) return [];

  // Sort events by timestamp
  const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  const blocks: SessionBlock[] = [];
  let currentBlock: SessionBlock | null = null;

  for (const event of sortedEvents) {
    const eventTime = event.timestamp.getTime();

    // Check if we need to start a new block
    if (!currentBlock || eventTime >= currentBlock.endTime.getTime()) {
      // Finalize previous block if it exists
      if (currentBlock) {
        currentBlock.isActive = false;
        blocks.push(currentBlock);
      }

      // Start new block
      const blockStart = new Date(eventTime);
      const blockEnd = new Date(eventTime + BLOCK_DURATION_MS);
      
      currentBlock = {
        id: blockStart.toISOString(),
        startTime: blockStart,
        endTime: blockEnd,
        isActive: true,
        events: [],
        tokenCounts: {
          inputTokens: 0,
          outputTokens: 0,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
          totalTokens: 0,
        },
        models: [],
      };
    }

    // Add event to current block
    currentBlock.events.push(event);
    currentBlock.tokenCounts.inputTokens += event.tokensIn;
    currentBlock.tokenCounts.outputTokens += event.tokensOut;
    currentBlock.tokenCounts.totalTokens += event.tokensTotal;
    
    // Track unique models
    if (!currentBlock.models.includes(event.model)) {
      currentBlock.models.push(event.model);
    }
  }

  // Finalize the last block
  if (currentBlock) {
    const now = new Date();
    currentBlock.isActive = now.getTime() < currentBlock.endTime.getTime();
    blocks.push(currentBlock);
  }

  return blocks;
}

export function calculateBurnRate(events: NormalizedEvent[], timeWindowMinutes: number = 10): number {
  if (events.length === 0) return 0;

  const now = new Date();
  const cutoffTime = new Date(now.getTime() - timeWindowMinutes * 60 * 1000);
  
  const recentEvents = events.filter(event => event.timestamp.getTime() >= cutoffTime.getTime());
  
  if (recentEvents.length === 0) return 0;

  const totalTokens = recentEvents.reduce((sum, event) => sum + event.tokensTotal, 0);
  return totalTokens / timeWindowMinutes;
}

export function formatTimeRemaining(endTime: Date): string {
  const now = new Date();
  const remaining = endTime.getTime() - now.getTime();
  
  if (remaining <= 0) return '0m';
  
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function detectTokenLimit(blocks: SessionBlock[]): number {
  if (blocks.length === 0) return 500000; // Default 500k tokens
  
  const tokenCounts = blocks.map(block => block.tokenCounts.totalTokens);
  return Math.max(...tokenCounts);
}

export function generateTodayUsageReport(
  events: NormalizedEvent[], 
  timezone: string,
  tokenLimit?: number
): TodayUsageReport {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Filter events for today
  const todayEvents = events.filter(event => {
    const eventDate = event.timestamp.toISOString().split('T')[0];
    return eventDate === todayStr;
  });

  // Group into session blocks
  const blocks = groupEventsIntoBlocks(todayEvents);
  
  // Find active block
  const activeBlock = blocks.find(block => block.isActive);
  const completedBlocks = blocks.filter(block => !block.isActive);
  
  // Calculate total usage
  const totalTokens = todayEvents.reduce((sum, event) => sum + event.tokensTotal, 0);
  const totalPrompts = todayEvents.length;
  const totalDuration = todayEvents.reduce((sum, event) => sum + (event.durationMs || 0), 0);
  
  // Calculate model usage
  const modelStats: Record<string, { 
    tokens: number; 
    tokensIn: number;
    tokensOut: number;
    prompts: number; 
    costUSD: number;
    costInput: number;
    costOutput: number;
  }> = {};
  
  for (const event of todayEvents) {
    if (!modelStats[event.model]) {
      modelStats[event.model] = { 
        tokens: 0, 
        tokensIn: 0,
        tokensOut: 0,
        prompts: 0, 
        costUSD: 0,
        costInput: 0,
        costOutput: 0
      };
    }
    modelStats[event.model].tokens += event.tokensTotal;
    modelStats[event.model].tokensIn += event.tokensIn;
    modelStats[event.model].tokensOut += event.tokensOut;
    modelStats[event.model].prompts += 1;
    
    // Calculate costs separately for input and output
    const inputCost = calculateCost(event.model, event.tokensIn, 0);
    const outputCost = calculateCost(event.model, 0, event.tokensOut);
    modelStats[event.model].costInput += inputCost;
    modelStats[event.model].costOutput += outputCost;
    modelStats[event.model].costUSD += inputCost + outputCost;
  }

  // Auto-detect token limit if not provided
  const effectiveTokenLimit = tokenLimit || detectTokenLimit(blocks);

  const report: TodayUsageReport = {
    date: todayStr,
    timezone,
    totalUsage: {
      tokens: totalTokens,
      prompts: totalPrompts,
      durationMs: totalDuration,
    },
    completedBlocks,
    models: modelStats,
  };

  // Add active session info if exists
  if (activeBlock) {
    const burnRate = calculateBurnRate(activeBlock.events);
    const usagePercent = (activeBlock.tokenCounts.totalTokens / effectiveTokenLimit) * 100;
    const projectedTotal = activeBlock.tokenCounts.totalTokens + 
      (burnRate * (activeBlock.endTime.getTime() - Date.now()) / (60 * 1000));

    report.activeSession = {
      blockId: activeBlock.id,
      startTime: activeBlock.startTime,
      timeRemaining: formatTimeRemaining(activeBlock.endTime),
      tokensUsed: activeBlock.tokenCounts.totalTokens,
      burnRate,
      tokenLimit: effectiveTokenLimit,
      usagePercent,
      projectedTotal,
    };
  }

  return report;
}