import { StrictMode, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { WorkspaceCanvasProvider } from './shellCanvas/WorkspaceCanvasContext';
import { ShellStateProvider } from './shell/ShellStateContext';
import App from './App.tsx';
import './index.css';

/** Workspace canvas provider — must wrap the same React tree as `App`. */
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
    <Root />
  </StrictMode>,
);
