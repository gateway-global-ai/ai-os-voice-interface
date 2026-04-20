import { StrictMode, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { WorkspaceCanvasProvider } from './shellCanvas/WorkspaceCanvasContext';
import { ShellStateProvider } from './shell/ShellStateContext';
import App from './App.tsx';
import { KernelErrorBoundary } from './KernelErrorBoundary';
import './index.css';
function Root() {
  const speakTextRef = useRef<(text: string, overrideVoice?: string) => Promise<void>>(async () => {});

  return (
    <WorkspaceCanvasProvider
      onPolicyDenied={(payload) =>
        void speakTextRef.current(payload.spokenMessage ?? payload.reason)
      }
    >
      <ShellStateProvider>
        <App speakTextRef={speakTextRef} />
      </ShellStateProvider>
    </WorkspaceCanvasProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KernelErrorBoundary>
      <Root />
    </KernelErrorBoundary>
  </StrictMode>,
);
