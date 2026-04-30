import React, { useCallback, useState, useRef, useEffect } from 'react';
import { VibeCodingUniversityPanel, type VcuUniversityView } from './VibeCodingUniversityPanel';
import { CourseCreatorPanel } from './CourseCreatorPanel';
import { CheckmeSaasAdminPanel } from './CheckmeSaasAdminPanel';

// --- Types ---
type AppId = 'university' | 'course_creator' | 'checkme_admin';

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

export type { VcuUniversityView };

const WORK_WINDOW_SHELL_TOKENS: React.CSSProperties = {
  '--panel-bg': 'rgb(255 255 255)',
  '--panel-bg-hover': 'rgb(241 245 249)',
  '--panel-border': 'rgb(203 213 225)',
  '--panel-text': 'rgb(30 41 59)',
  '--panel-text-muted': 'rgb(71 85 105)',
  '--panel-accent-bg': 'rgb(219 234 254)',
  '--panel-accent-border': 'rgb(147 197 253)',
  '--panel-accent-text': 'rgb(29 78 216)',
  '--panel-surface': 'rgb(248 250 252)',
  '--panel-surface-hover': 'rgb(241 245 249)',
  '--panel-heading': 'rgb(15 23 42)',
  '--panel-input-bg': 'rgb(255 255 255)',
  '--panel-input-border': 'rgb(203 213 225)',
} as React.CSSProperties;

function createAppContent(universityView: VcuUniversityView = 'intro'): Record<AppId, React.ReactNode> {
  return {
    university: <VibeCodingUniversityPanel initialView={universityView} />,
    course_creator: <CourseCreatorPanel />,
    checkme_admin: <CheckmeSaasAdminPanel />,
  };
}

export const VirtualDesktopEnvironment: React.FC<{
  authStatus: 'guest' | 'authenticated';
  launchUniversityView?: VcuUniversityView | null;
  launchRevision?: number;
  onOpenUniversity?: () => void;
}> = ({ authStatus, launchUniversityView = null, launchRevision = 0, onOpenUniversity }) => {
  // --- State: Window Management ---
  const [openWindows, setOpenWindows] = useState<DesktopWindow[]>([]);
  const [highestZIndex, setHighestZIndex] = useState(10);
  
  // Drag State
  const [draggingWindowId, setDraggingWindowId] = useState<AppId | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // --- State: Notifications ---
  const [notifications] = useState<Notification[]>([]);
  const [showTray, setShowTray] = useState(false);

  const getAppContent = useCallback((id: AppId, universityView: VcuUniversityView = 'intro') => {
    const map = createAppContent(universityView);
    return map[id];
  }, []);

  useEffect(() => {
    if (authStatus === 'guest') {
      setOpenWindows([]);
    }
  }, [authStatus]);

  // --- Handlers ---
  const openApp = useCallback((id: AppId, title: string, universityView: VcuUniversityView = 'intro') => {
    if (authStatus === 'guest') {
      return;
    }
    if (id === 'university') {
      onOpenUniversity?.();
    }

    setHighestZIndex(prevZIndex => {
      const newZIndex = prevZIndex + 1;
      setOpenWindows(prev => {
        const existingWindow = prev.find(w => w.id === id);
        if (existingWindow) {
          return prev.map(w => w.id === id ? { ...w, zIndex: newZIndex, content: getAppContent(id, universityView) } : w);
        }
        const W = id === 'university' ? 900 : id === 'course_creator' ? 960 : 1100;
        const H = id === 'university' ? 620 : id === 'course_creator' ? 720 : 760;
        return [...prev, {
          id,
          title,
          zIndex: newZIndex,
          content: getAppContent(id, universityView),
          x: 200 + (prev.length * 30),
          y: 100 + (prev.length * 30),
          width: W,
          height: H,
          isMaximized: id === 'checkme_admin',
        }];
      });
      return newZIndex;
    });
  }, [authStatus, getAppContent, onOpenUniversity]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !launchUniversityView) return;
    openApp('university', 'Vibe Coding University', launchUniversityView);
  }, [authStatus, launchRevision, launchUniversityView, openApp]);

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
          { id: 'university' as const, title: 'Vibe Coding University', icon: 'VCU' },
          { id: 'course_creator' as const, title: 'Course Creator', icon: 'CC' },
          { id: 'checkme_admin' as const, title: '123CheckMe Admin', icon: '123' },
        ].map((app) => (
          <button
            key={app.id}
            onClick={() => { openApp(app.id, app.title, 'intro'); }}
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
              fontSize: '1rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: 'var(--panel-heading)',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              position: 'relative'
            }}>
              {app.icon}
              {authStatus === 'guest' && (
                <div style={{ position: 'absolute', bottom: -5, right: -5, fontSize: '0.65rem', color: 'var(--panel-text-muted)' }}>LOCK</div>
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
            opacity: 1, // Ensure strictly solid background, no alpha transparency on click/drag
            ...WORK_WINDOW_SHELL_TOKENS,
          }}
        >
          {/* Window Header */}
          <div 
            onPointerDown={(e) => handlePointerDown(e, win.id, win.x, win.y)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              background: win.id === 'course_creator' ? 'rgb(15 47 95)' : 'var(--panel-bg)',
              borderBottom: win.id === 'course_creator' ? '1px solid rgb(30 64 122)' : '1px solid var(--panel-border)',
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
            <span style={{ color: win.id === 'course_creator' ? 'rgb(239 246 255)' : 'var(--panel-heading)', fontWeight: 600, fontSize: '0.875rem' }}>
              {win.title}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); toggleMaximize(win.id); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: win.id === 'course_creator' ? 'rgb(191 219 254)' : 'var(--panel-text-muted)',
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
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: win.id === 'course_creator' ? 'rgb(191 219 254)' : 'var(--panel-text-muted)',
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
          Alerts <span style={{ background: 'var(--panel-accent-bg)', color: 'var(--panel-accent-text)', padding: '0.1rem 0.4rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold' }}>{notifications.length}</span>
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
            {notifications.length === 0 && (
              <div style={{ color: 'var(--panel-text-muted)', fontSize: '0.8rem' }}>
                No verified system notifications.
              </div>
            )}
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
