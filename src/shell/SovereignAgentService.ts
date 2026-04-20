import { Command } from '@tauri-apps/plugin-shell';
import type { IntentReviewHandoffEnvelope, SovereignAnalysisResponse } from './shellMenuStoreTypes';

export class SovereignAgentService {
  /**
   * Spawns the local Rust MCP agent via Tauri IPC and sends a JSON-RPC request.
   */
  public async analyzeIntent(handoff: IntentReviewHandoffEnvelope): Promise<SovereignAnalysisResponse> {
    return new Promise((resolve, reject) => {
      const instructions = `Review the intent: ${handoff.user_intent.transcript}`;
      const codeSnippet = `// Project Baseline: ${handoff.project_baseline.project_id}`;

      const initPayload = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'ai-os-voice-interface', version: '1.0.0' }
        }
      };

      const requestPayload = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'local_code_analysis',
          arguments: {
            code_snippet: codeSnippet,
            instructions: instructions,
          },
        },
      };

      console.log('[SovereignAgentService] Spawning aios-coding-agent via cargo...');
      
      const command = Command.create('cargo', ['run', '--manifest-path', 'C:/Apps/coding_agent/aios-coding-agent/Cargo.toml']);
      let responseBuffer = '';
      let isInitialized = false;

      command.stdout.on('data', (line) => {
        const text = line.toString();
        console.log('[SovereignAgentService] stdout:', text);
        responseBuffer += text;
        
        try {
          // Try parsing the buffer as JSON-RPC
          const json = JSON.parse(responseBuffer.trim());
          
          if (json.id === 1 && json.result && !isInitialized) {
            isInitialized = true;
            responseBuffer = ''; // Clear buffer
            console.log('[SovereignAgentService] Initialized. Sending tools/call...');
          } else if (json.id === 2 && json.result) {
            // The tool returns a stringified SovereignAnalysisResponse in content[0].text
            const contentText = json.result.content?.[0]?.text;
            if (contentText) {
              const analysis = JSON.parse(contentText) as SovereignAnalysisResponse;
              resolve(analysis);
            }
          }
        } catch (e) {
          // Incomplete JSON, wait for more data
        }
      });

      command.stderr.on('data', (line) => {
        console.error('[SovereignAgentService] stderr:', line.toString());
      });

      command.on('error', (error) => {
        console.error('[SovereignAgentService] Process error:', error);
        reject(error);
      });

      command.spawn()
        .then(async (child) => {
          console.log('[SovereignAgentService] Agent spawned with PID:', child.pid);
          
          // Wait a brief moment for the server to start
          setTimeout(async () => {
            console.log('[SovereignAgentService] Sending initialize request...');
            await child.write(JSON.stringify(initPayload) + '\n');
            
            // Poll for initialized state
            const checkInit = setInterval(async () => {
              if (isInitialized) {
                clearInterval(checkInit);
                await child.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
                await child.write(JSON.stringify(requestPayload) + '\n');
                
                // Clean up after a timeout if no response
                setTimeout(() => {
                  child.kill();
                }, 30000);
              }
            }, 100);
            
          }, 2000);
        })
        .catch(reject);
    });
  }
}

export const sovereignAgentService = new SovereignAgentService();
