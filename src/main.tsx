import { StrictMode, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GovernanceCanvasProvider } from './governance/GovernanceCanvasContext';
import App from './App.tsx';
import './index.css';

/** Provider lives at the entry root so `useGovernanceCanvas` always runs under the same React tree as the context. */
function Root() {
  const speakTextRef = useRef<(text: string, overrideVoice?: string) => Promise<void>>(async () => {});
  return (
    <GovernanceCanvasProvider
      onPolicyDenied={(payload) =>
        void speakTextRef.current(payload.spokenMessage ?? payload.reason)
      }
    >
      <App speakTextRef={speakTextRef} />
    </GovernanceCanvasProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
