import type { NormalizedEvent } from './types.js';

const MAX_INFERRED_DURATION_MS = 120_000; // 2 minutes
const SESSION_GROUPING_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

interface EventWithInferredDuration extends NormalizedEvent {
  inferredDurationMs?: number;
}

export function estimateDurations(events: NormalizedEvent[]): EventWithInferredDuration[] {
  const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const eventsWithDuration: EventWithInferredDuration[] = [];
  
  // Group events by session or project for duration estimation
  const sessionGroups = new Map<string, NormalizedEvent[]>();
  
  for (const event of sortedEvents) {
    const groupKey = event.sessionId || inferSessionKey(event);
    if (!sessionGroups.has(groupKey)) {
      sessionGroups.set(groupKey, []);
    }
    sessionGroups.get(groupKey)!.push(event);
  }
  
  // Process each group to estimate durations
  for (const [_groupKey, groupEvents] of sessionGroups) {
    const groupSorted = groupEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    for (let i = 0; i < groupSorted.length; i++) {
      const current = groupSorted[i];
      const eventWithDuration: EventWithInferredDuration = { ...current };
      
      if (current.durationMs !== undefined) {
        // Use existing duration if available
        eventWithDuration.inferredDurationMs = current.durationMs;
      } else {
        // Estimate duration based on next event timing
        const next = groupSorted[i + 1];
        if (next) {
          const timeDiff = next.timestamp.getTime() - current.timestamp.getTime();
          eventWithDuration.inferredDurationMs = Math.min(timeDiff, MAX_INFERRED_DURATION_MS);
        } else {
          // Last event in group - use a default duration
          eventWithDuration.inferredDurationMs = Math.min(30_000, MAX_INFERRED_DURATION_MS); // 30 seconds default
        }
      }
      
      eventsWithDuration.push(eventWithDuration);
    }
  }
  
  return eventsWithDuration;
}

function inferSessionKey(event: NormalizedEvent): string {
  // If no session ID, group by project and time window
  const projectKey = event.project || 'unknown';
  const timeWindow = Math.floor(event.timestamp.getTime() / SESSION_GROUPING_WINDOW_MS);
  return `${projectKey}:${timeWindow}`;
}

export function getDurationMs(event: EventWithInferredDuration): number {
  return event.inferredDurationMs || event.durationMs || 0;
}