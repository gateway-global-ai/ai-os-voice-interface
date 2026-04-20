import type { ProjectBaseline, ShortcutDetectionReport } from './shellMenuStoreTypes';

export interface FileContentMap {
  [filepath: string]: string;
}

export class HeuristicShortcutScanner {
  /**
   * Scans a map of file contents for deterministic AI shortcut patterns.
   * In a real implementation, this would resolve the ProjectBaseline to actual files.
   */
  public async scanProject(baseline: ProjectBaseline, files: FileContentMap): Promise<ShortcutDetectionReport> {
    const report: ShortcutDetectionReport = {
      ui_fragility: [],
      mock_data_hallucinations: [],
      repeated_code: [],
      suppressed_exceptions: [],
    };

    // UI Fragility: Inline CSS with hardcoded pixels, absolute pixel values, or brittle class selectors
    const uiFragilityPattern = /(style=\{\{.*?\d+px.*?\}\})|(\.[a-zA-Z0-9_-]+-\d{1,5}\s*\{)/g;
    
    // Mock Data & API Shortcuts: Hardcoded JSON arrays serving as fake DB responses, or placeholder env vars
    const mockDataPattern = /(\[\s*\{\s*["']id["']\s*:)|(YOUR_API_KEY)|(process\.env\.MOCK_[A-Z_]+)/g;
    
    // Suppressed Exceptions: Empty catch blocks that silently swallow failures
    const emptyCatchPattern = /catch\s*\([^)]*\)\s*\{\s*\}/g;

    const lineHashes = new Map<string, string[]>(); // hash -> filepaths

    for (const [filepath, content] of Object.entries(files)) {
      if (uiFragilityPattern.test(content)) {
        report.ui_fragility.push(`Fragile UI pattern detected in ${filepath}`);
      }
      if (mockDataPattern.test(content)) {
        report.mock_data_hallucinations.push(`Mock data or placeholder API key found in ${filepath}`);
      }
      if (emptyCatchPattern.test(content)) {
        report.suppressed_exceptions.push(`Empty catch block (suppressed exception) in ${filepath}`);
      }

      // Basic heuristic for Repeated Code / Lack of Abstraction:
      // Flag highly duplicated functional logic blocks across different files.
      const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      for (let i = 0; i < lines.length - 5; i++) {
        const block = lines.slice(i, i + 5).join('\n');
        if (block.length > 50) { // Ignore very short blocks
          if (!lineHashes.has(block)) {
            lineHashes.set(block, []);
          }
          lineHashes.get(block)!.push(filepath);
        }
      }
    }

    // Process repeated code
    for (const [block, filepaths] of lineHashes.entries()) {
      const uniqueFiles = Array.from(new Set(filepaths));
      if (uniqueFiles.length > 1) {
        report.repeated_code.push(`Duplicated functional logic block found across: ${uniqueFiles.join(', ')}`);
      }
    }

    // Deduplicate repeated code reports
    report.repeated_code = Array.from(new Set(report.repeated_code));

    return report;
  }
}

export const heuristicShortcutScanner = new HeuristicShortcutScanner();
