import React, { useState, useRef, useEffect } from 'react';

// --- Types ---
type AppId = 'university' | 'coder' | 'community' | 'knowledge' | 'onboarding';

interface DesktopWindow {
  id: AppId;
  title: string;
  zIndex: number;
  content: React.ReactNode;
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

interface Notification {
  id: string;
  message: string;
  time: string;
}

// --- Mock App Content ---
const AppContent: Record<AppId, React.ReactNode> = {
  university: (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2>🎓 Vibe Coding University</h2>
      <p>Educational hub explaining LLMs as statistical machines and platform economics.</p>
      <ul>
        <li>Understanding Statistical Machines</li>
        <li>Platform Economics & Open Source</li>
        <li>The Fallacy of "Vibe Coding"</li>
      </ul>
    </div>
  ),
  coder: (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2>💻 Let's Build! (The Vibe Coder)</h2>
      <p>Project intake portal emphasizing AI OS governance and Triangulated Code Reviews.</p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button style={{ padding: '0.5rem 1rem', background: 'var(--panel-accent-bg)', color: 'var(--panel-accent-text)', border: '1px solid var(--panel-accent-border)', borderRadius: '0.5rem' }}>New Project</button>
        <button style={{ padding: '0.5rem 1rem', background: 'var(--panel-surface)', color: 'var(--panel-text)', border: '1px solid var(--panel-border)', borderRadius: '0.5rem' }}>Upload .zip</button>
        <button style={{ padding: '0.5rem 1rem', background: 'var(--panel-surface)', color: 'var(--panel-text)', border: '1px solid var(--panel-border)', borderRadius: '0.5rem' }}>Connect GitHub Repo</button>
      </div>
    </div>
  ),
  community: (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2>🌐 Join The Community</h2>
      <p>Scaffolded community hub for peer-to-peer messaging and profiles.</p>
      <div style={{ padding: '1rem', background: 'var(--panel-surface)', border: '1px solid var(--panel-border)', borderRadius: '0.5rem' }}>
        <p>Connecting to message boards...</p>
      </div>
    </div>
  ),
  knowledge: <div style={{ padding: '1rem' }}>📚 Knowledge Base. Querying governed documentation and architectural standards...</div>,
  onboarding: (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center', height: '100%', overflowY: 'auto' }}>
      <div style={{ textAlign: 'center', maxWidth: '600px' }}>
        <h2>Welcome to AI OS</h2>
        <p style={{ color: 'var(--panel-text-muted)', marginTop: '0.5rem' }}>You are currently unauthenticated. Please ask the AI agent to create an account or sign you in to unlock the full Virtual Desktop Environment.</p>
      </div>
      
      {/* SaaS Pricing Component */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: '800px' }}>
        <div style={{ flex: '1 1 300px', padding: '2rem', background: 'var(--panel-surface)', border: '1px solid var(--panel-border)', borderRadius: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0 }}>Primary Tier</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>$49.95<span style={{ fontSize: '1rem', color: 'var(--panel-text-muted)', fontWeight: 'normal' }}>/month</span></div>
          <div style={{ color: 'var(--panel-accent-text)', fontWeight: 'bold' }}>30 Days Free Trial</div>
          <ul style={{ paddingLeft: '1.5rem', margin: 0, color: 'var(--panel-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>Full access to Vibe Coding University</li>
            <li>Unlimited Community Hub access</li>
            <li>Triangulated Code Reviews</li>
          </ul>
        </div>
        
        <div style={{ flex: '1 1 300px', padding: '2rem', background: 'var(--panel-surface)', border: '2px solid var(--panel-accent-border)', borderRadius: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '-12px', right: '2rem', background: 'var(--panel-accent-bg)', color: 'var(--panel-accent-text)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold' }}>Early Bird</div>
          <h3 style={{ margin: 0 }}>Early Bird Tier</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>$20.00<span style={{ fontSize: '1rem', color: 'var(--panel-text-muted)', fontWeight: 'normal' }}>/month</span></div>
          <div style={{ color: 'var(--panel-text-muted)' }}>Limited time offer for early adopters</div>
          <ul style={{ paddingLeft: '1.5rem', margin: 0, color: 'var(--panel-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>Everything in Primary Tier</li>
            <li>Priority support</li>
            <li>Exclusive early access features</li>
          </ul>
        </div>
      </div>
    </div>
  ),
};

export const VirtualDesktopEnvironment: React.FC<{ authStatus: 'guest' | 'authenticated' }> = ({ authStatus }) => {
  // --- State: Window Management ---
  const [openWindows, setOpenWindows] = useState<DesktopWindow[]>([]);
  const [highestZIndex, setHighestZIndex] = useState(10);
  
  // Drag State
  const [draggingWindowId, setDraggingWindowId] = useState<AppId | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // --- State: Notifications ---
  const [notifications] = useState<Notification[]>([
    { id: '1', message: 'Triangulation Review Complete: 85% Confidence Score', time: 'Just now' },
    { id: '2', message: 'Rust MCP Agent connected successfully.', time: '2m ago' }
  ]);
  const [showTray, setShowTray] = useState(false);

  // --- Enforce Guest Restrictions ---
  useEffect(() => {
    if (authStatus === 'guest') {
      // Close restricted apps
      setOpenWindows(prev => prev.filter(w => w.id === 'onboarding'));
      // Ensure onboarding is open
      setOpenWindows(prev => {
        if (!prev.find(w => w.id === 'onboarding')) {
          return [...prev, {
            id: 'onboarding',
            title: 'Greeting Agent / Onboarding',
            zIndex: highestZIndex + 1,
            content: AppContent['onboarding'],
            x: 100,
            y: 100,
            width: 600,
            height: 400,
            isMaximized: false
          }];
        }
        return prev;
      });
      setHighestZIndex(prev => prev + 1);
    } else {
      // If authenticated, close onboarding
      setOpenWindows(prev => prev.filter(w => w.id !== 'onboarding'));
    }
  }, [authStatus]); // highestZIndex omitted to avoid loop

  // --- Handlers ---
  const openApp = (id: AppId, title: string) => {
    if (authStatus === 'guest' && id !== 'onboarding') {
      // Prevent opening restricted apps
      return;
    }

    const existingWindow = openWindows.find(w => w.id === id);
    const newZIndex = highestZIndex + 1;
    setHighestZIndex(newZIndex);

    if (existingWindow) {
      // Bring to front
      setOpenWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: newZIndex } : w));
    } else {
      // Open new window
      setOpenWindows(prev => [...prev, { 
        id, 
        title, 
        zIndex: newZIndex, 
        content: AppContent[id],
        x: 200 + (prev.length * 30),
        y: 100 + (prev.length * 30),
        width: 600,
        height: 400,
        isMaximized: false
      }]);
    }
  };

  const focusWindow = (id: AppId) => {
    const newZIndex = highestZIndex + 1;
    setHighestZIndex(newZIndex);
    setOpenWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: newZIndex } : w));
  };

  const closeWindow = (id: AppId) => {
    setOpenWindows(prev => prev.filter(w => w.id !== id));
  };

  const toggleMaximize = (id: AppId) => {
    setOpenWindows(prev => prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w));
  };

  // --- Drag Handlers ---
  const handlePointerDown = (e: React.PointerEvent, id: AppId, currentX: number, currentY: number) => {
    // Only allow drag if not maximized
    const win = openWindows.find(w => w.id === id);
    if (win && win.isMaximized) return;

    focusWindow(id);
    setDraggingWindowId(id);
    setDragOffset({
      x: e.clientX - currentX,
      y: e.clientY - currentY
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingWindowId) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    setOpenWindows(prev => prev.map(w => 
      w.id === draggingWindowId ? { ...w, x: newX, y: newY } : w
    ));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingWindowId) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDraggingWindowId(null);
    }
  };

  return (
    <div 
      style={{ 
        background: 'transparent', 
        color: 'var(--panel-text)',
        minHeight: '100vh',
        paddingTop: 'calc(var(--shell-header-height) + 1rem)',
        paddingBottom: 'calc(var(--shell-footer-height) + 1rem)',
        position: 'relative', // Bounding container for absolute windows
        overflow: 'hidden',
        display: 'flex'
      }}
    >
      {/* STEP 1: Desktop Surface & Large App Icons */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.5rem', 
        padding: '2rem',
        zIndex: 1 // Keep icons behind windows
      }}>
        {[
          { id: 'university', title: 'Vibe Coding University', icon: '🎓' },
          { id: 'coder', title: 'The Vibe Coder', icon: '💻' },
          { id: 'community', title: 'Community Hub', icon: '🌐' },
          { id: 'knowledge', title: 'Knowledge Base', icon: '📚' },
        ].map(app => (
          <button 
            key={app.id}
            onClick={() => openApp(app.id as AppId, app.title)}
            disabled={authStatus === 'guest'}
            style={{
              background: 'transparent',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: authStatus === 'guest' ? 'not-allowed' : 'pointer',
              width: '100px',
              opacity: authStatus === 'guest' ? 0.5 : 1
            }}
          >
            <div style={{
              background: 'var(--panel-surface)',
              border: '1px solid var(--panel-border)',
              borderRadius: '1rem',
              width: '64px',
              height: '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              position: 'relative'
            }}>
              {app.icon}
              {authStatus === 'guest' && (
                <div style={{ position: 'absolute', bottom: -5, right: -5, fontSize: '1.2rem' }}>🔒</div>
              )}
            </div>
            <span style={{ 
              color: 'var(--panel-text)', 
              fontSize: '0.875rem', 
              textAlign: 'center',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)' // Better readability on desktop bg
            }}>
              {app.title}
            </span>
          </button>
        ))}
      </div>

      {/* STEP 2: The Window Management State (Render Windows) */}
      {openWindows.map((win) => (
        <div 
          key={win.id}
          onPointerDown={() => focusWindow(win.id)}
          style={{
            position: 'absolute',
            top: win.isMaximized ? '0' : `${win.y}px`,
            left: win.isMaximized ? '0' : `${win.x}px`,
            width: win.isMaximized ? '100%' : `${win.width}px`,
            height: win.isMaximized ? '100%' : `${win.height}px`,
            background: 'var(--panel-surface)',
            border: win.isMaximized ? 'none' : '1px solid var(--panel-border)',
            borderRadius: win.isMaximized ? '0' : '0.5rem',
            zIndex: win.zIndex,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: win.isMaximized ? 'none' : '0 10px 25px rgba(0,0,0,0.2)',
            transition: draggingWindowId === win.id ? 'none' : 'width 0.2s, height 0.2s, top 0.2s, left 0.2s',
            opacity: 1 // Ensure strictly solid background, no alpha transparency on click/drag
          }}
        >
          {/* Window Header */}
          <div 
            onPointerDown={(e) => handlePointerDown(e, win.id, win.x, win.y)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              background: 'var(--panel-bg)',
              borderBottom: '1px solid var(--panel-border)',
              padding: '0.5rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTopLeftRadius: win.isMaximized ? '0' : '0.5rem',
              borderTopRightRadius: win.isMaximized ? '0' : '0.5rem',
              cursor: win.isMaximized ? 'default' : 'grab',
              userSelect: 'none',
              touchAction: 'none'
            }}
          >
            <span style={{ color: 'var(--panel-heading)', fontWeight: 600, fontSize: '0.875rem' }}>
              {win.title}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleMaximize(win.id); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--panel-text-muted)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--panel-bg-hover)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {win.isMaximized ? '❐' : '□'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--panel-text-muted)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--panel-bg-hover)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                ✕
              </button>
            </div>
          </div>
          {/* Window Content */}
          <div style={{ flexGrow: 1, overflow: 'auto', color: 'var(--panel-text)' }}>
            {win.content}
          </div>
        </div>
      ))}

      {/* STEP 3: The System Notification Tray */}
      <div style={{
        position: 'absolute',
        bottom: 'calc(var(--shell-footer-height) + 1.5rem)',
        right: '2rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0.5rem'
      }}>
        {/* Tray Toggle Button */}
        <button 
          onClick={() => setShowTray(!showTray)}
          style={{
            background: 'var(--panel-surface)',
            border: '1px solid var(--panel-border)',
            color: 'var(--panel-text)',
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
          }}
        >
          🔔 <span style={{ background: 'var(--panel-accent-bg)', color: 'var(--panel-accent-text)', padding: '0.1rem 0.4rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold' }}>{notifications.length}</span>
        </button>

        {/* Tray Popover (Bounded within desktop) */}
        {showTray && (
          <div style={{
            background: 'var(--panel-surface)',
            border: '1px solid var(--panel-border)',
            borderRadius: '0.5rem',
            width: '300px',
            padding: '1rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <h4 style={{ color: 'var(--panel-heading)', margin: 0, fontSize: '0.875rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.5rem' }}>
              System Notifications
            </h4>
            {notifications.map(notif => (
              <div key={notif.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ color: 'var(--panel-text)', fontSize: '0.875rem' }}>{notif.message}</span>
                <span style={{ color: 'var(--panel-text-muted)', fontSize: '0.75rem' }}>{notif.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
