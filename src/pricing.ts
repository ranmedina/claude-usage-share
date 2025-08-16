export interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

export const CLAUDE_PRICING: Record<string, ModelPricing> = {
  'claude-opus-4-1': {
    inputPer1M: 15.00,
    outputPer1M: 75.00,
  },
  'claude-opus-4': {
    inputPer1M: 15.00,
    outputPer1M: 75.00,
  },
  'claude-3-opus': {
    inputPer1M: 15.00,
    outputPer1M: 75.00,
  },
  'claude-3-5-opus': {
    inputPer1M: 15.00,
    outputPer1M: 75.00,
  },
  'claude-sonnet-4': {
    inputPer1M: 3.00,
    outputPer1M: 15.00,
  },
  'claude-3-sonnet': {
    inputPer1M: 3.00,
    outputPer1M: 15.00,
  },
  'claude-3-5-sonnet': {
    inputPer1M: 3.00,
    outputPer1M: 15.00,
  },
  'claude-3-haiku': {
    inputPer1M: 0.25,
    outputPer1M: 1.25,
  },
  'claude-3-5-haiku': {
    inputPer1M: 0.80,
    outputPer1M: 4.00,
  },
  'claude-instant': {
    inputPer1M: 0.80,
    outputPer1M: 2.40,
  },
};

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const modelLower = model.toLowerCase();
  
  // Default to latest versions for simple model names
  let modelKey: string | undefined;
  
  if (modelLower === 'opus') {
    modelKey = 'claude-opus-4-1';
  } else if (modelLower === 'sonnet') {
    modelKey = 'claude-sonnet-4';
  } else if (modelLower === 'haiku') {
    modelKey = 'claude-3-5-haiku';
  } else {
    // Try to find exact match for more specific model names
    modelKey = Object.keys(CLAUDE_PRICING).find(key => {
      const keyLower = key.toLowerCase();
      return modelLower.includes(keyLower) ||
             modelLower.includes(keyLower.replace('-', '.')) ||
             modelLower.includes(keyLower.replace('claude-', '')) ||
             (keyLower.includes('opus-4-1') && modelLower.includes('opus') && modelLower.includes('4.1')) ||
             (keyLower.includes('opus-4') && modelLower.includes('opus') && modelLower.includes('4')) ||
             (keyLower.includes('sonnet-4') && modelLower.includes('sonnet') && modelLower.includes('4'));
    });
  }

  if (!modelKey) {
    return 0;
  }

  const pricing = CLAUDE_PRICING[modelKey];
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  
  return inputCost + outputCost;
}