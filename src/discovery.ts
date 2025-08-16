import { homedir } from 'os';
import { join } from 'path';
import { glob } from 'fast-glob';
import { access, constants } from 'fs/promises';

const CLAUDE_CONFIG_DIR_ENV = 'CLAUDE_CONFIG_DIR';
const CLAUDE_PATHS_ENV = 'CLAUDE_PATHS';

export function getClaudePaths(): string[] {
  // Check CLAUDE_PATHS environment variable first for multiple custom paths
  const customPaths = (process.env[CLAUDE_PATHS_ENV] ?? '').trim();
  if (customPaths !== '') {
    return customPaths.split(',').map(p => p.trim());
  }
  
  // Check CLAUDE_CONFIG_DIR environment variable (matches ccusage logic)
  const envPaths = (process.env[CLAUDE_CONFIG_DIR_ENV] ?? '').trim();
  if (envPaths !== '') {
    return envPaths.split(',').map(p => p.trim());
  }
  
  // Use default paths - both new and legacy locations
  return [
    join(homedir(), '.config/claude'),  // ~/.config/claude (new default)
    join(homedir(), '.claude')          // ~/.claude (legacy default)
  ];
}

export function getDefaultLogPaths(): string[] {
  // Legacy function - now uses getClaudePaths() + '/projects'
  return getClaudePaths().map(path => join(path, 'projects'));
}

export async function discoverLogFiles(searchPaths?: string[]): Promise<string[]> {
  let basePaths: string[];
  
  if (searchPaths && searchPaths.length > 0) {
    // Use provided paths directly (assume they're files or directories)
    basePaths = searchPaths;
  } else {
    // Get all Claude config paths and check both root and /projects subdirectories
    const claudePaths = getClaudePaths();
    basePaths = [];
    
    // Add both the root paths and /projects subdirectories
    for (const claudePath of claudePaths) {
      basePaths.push(claudePath);                    // Root claude config directory
      basePaths.push(join(claudePath, 'projects'));  // /projects subdirectory
    }
  }
  
  const allFiles: string[] = [];
  
  for (const basePath of basePaths) {
    try {
      // Check if path exists and is readable
      const stat = await access(basePath, constants.R_OK).then(() => true).catch(() => false);
      if (!stat) continue;
      
      // If it's a specific file, add it directly
      if (basePath.endsWith('.jsonl') || basePath.endsWith('.log')) {
        allFiles.push(basePath);
        continue;
      }
      
      // If it's a directory, search for JSONL files recursively (matches ccusage pattern)
      try {
        const files = await glob('**/*.jsonl', {
          cwd: basePath,
          onlyFiles: true,
          absolute: true,
          ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
        });
        allFiles.push(...files);
      } catch (error) {
        console.warn(`Warning: Failed to search for log files in directory ${basePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        continue;
      }
    } catch (error) {
      console.warn(`Warning: Directory ${basePath} is not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`);
      continue;
    }
  }
  
  // Remove duplicates and sort by modification time (newest first)
  const uniqueFiles = [...new Set(allFiles)];
  return uniqueFiles.sort();
}

export async function isJsonlFile(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return filePath.endsWith('.jsonl') || filePath.endsWith('.log');
  } catch {
    return false;
  }
}