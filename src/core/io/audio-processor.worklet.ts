/**
 * AudioWorklet processor for raw PCM capture.
 * Replaces deprecated ScriptProcessorNode with modern AudioWorkletNode.
 * 
 * This file is bundled as a string and loaded as a data URL blob.
 * 
 * @license SPDX-License-Identifier: Apache-2.0
 */

export const pcmCaptureWorkletCode = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs, _outputs, _parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0]; // Mono channel
      
      // Send the PCM data to the main thread
      this.port.postMessage({
        type: 'pcm-data',
        data: channelData
      });
    }
    
    // Return true to keep the processor alive
    return true;
  }
}

registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
`;
