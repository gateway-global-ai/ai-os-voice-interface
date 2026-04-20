import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useShellTheme } from '../../shell/useShellTheme';

interface AppearancePanelProps {
  onBack: () => void;
}

export const AppearancePanel: React.FC<AppearancePanelProps> = ({ onBack }) => {
  const { theme, setTheme, resetTheme } = useShellTheme();

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--panel-heading)', margin: 0 }}>Appearance Settings</h2>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--panel-text-muted)', cursor: 'pointer' }}>Back</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ color: 'var(--panel-text)' }}>Color Scheme</label>
        <select 
          value={theme.colorScheme} 
          onChange={(e) => setTheme({ colorScheme: e.target.value as 'dark' | 'light' })}
          style={{ background: 'var(--panel-input-bg)', color: 'var(--panel-text)', border: '1px solid var(--panel-input-border)', padding: '0.5rem', borderRadius: '0.25rem' }}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ color: 'var(--panel-text)' }}>Overlay Tint Color</label>
        <input 
          type="color" 
          value={theme.overlayColor || '#020617'} 
          onChange={(e) => setTheme({ overlayColor: e.target.value })}
          style={{ background: 'var(--panel-input-bg)', border: '1px solid var(--panel-input-border)', padding: '0.25rem', borderRadius: '0.25rem' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ color: 'var(--panel-text)' }}>Overlay Opacity</label>
        <input 
          type="range" 
          min="0" max="1" step="0.05" 
          value={theme.overlayOpacity ?? 0.8} 
          onChange={(e) => setTheme({ overlayOpacity: parseFloat(e.target.value) })}
        />
      </div>

      <button 
        onClick={resetTheme}
        style={{ padding: '0.5rem', background: 'var(--panel-surface)', color: 'var(--panel-text)', border: '1px solid var(--panel-border)', borderRadius: '0.25rem', cursor: 'pointer', marginTop: '1rem' }}
      >
        Reset to Defaults
      </button>
    </div>
  );
};
