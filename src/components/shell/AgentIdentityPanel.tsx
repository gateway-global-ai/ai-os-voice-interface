import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface AgentIdentityPanelProps {
  onBack: () => void;
  agentName: string;
  agentCompany: string;
  agentRole: string;
  agentIntent: string;
  userIntent: string;
  desiredOutcome: string;
  onUpdate: (key: string, value: string) => void;
}

export const AgentIdentityPanel: React.FC<AgentIdentityPanelProps> = ({ 
  onBack, agentName, agentCompany, agentRole, agentIntent, userIntent, desiredOutcome, onUpdate 
}) => {
  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--panel-heading)', margin: 0 }}>Agent Identity Settings</h2>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--panel-text-muted)', cursor: 'pointer' }}>Back</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ color: 'var(--panel-text)', fontSize: '0.875rem' }}>Agent Name</label>
        <input 
          type="text" 
          value={agentName} 
          onChange={(e) => onUpdate('agentName', e.target.value)}
          style={{ background: 'var(--panel-input-bg)', color: 'var(--panel-text)', border: '1px solid var(--panel-input-border)', padding: '0.5rem', borderRadius: '0.25rem' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ color: 'var(--panel-text)', fontSize: '0.875rem' }}>Agent Company</label>
        <input 
          type="text" 
          value={agentCompany} 
          onChange={(e) => onUpdate('agentCompany', e.target.value)}
          style={{ background: 'var(--panel-input-bg)', color: 'var(--panel-text)', border: '1px solid var(--panel-input-border)', padding: '0.5rem', borderRadius: '0.25rem' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ color: 'var(--panel-text)', fontSize: '0.875rem' }}>Agent Role</label>
        <input 
          type="text" 
          value={agentRole} 
          onChange={(e) => onUpdate('agentRole', e.target.value)}
          style={{ background: 'var(--panel-input-bg)', color: 'var(--panel-text)', border: '1px solid var(--panel-input-border)', padding: '0.5rem', borderRadius: '0.25rem' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ color: 'var(--panel-text)', fontSize: '0.875rem' }}>Agent Intent</label>
        <textarea 
          value={agentIntent} 
          onChange={(e) => onUpdate('agentIntent', e.target.value)}
          rows={3}
          style={{ background: 'var(--panel-input-bg)', color: 'var(--panel-text)', border: '1px solid var(--panel-input-border)', padding: '0.5rem', borderRadius: '0.25rem', resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ color: 'var(--panel-text)', fontSize: '0.875rem' }}>User Intent</label>
        <textarea 
          value={userIntent} 
          onChange={(e) => onUpdate('userIntent', e.target.value)}
          rows={3}
          style={{ background: 'var(--panel-input-bg)', color: 'var(--panel-text)', border: '1px solid var(--panel-input-border)', padding: '0.5rem', borderRadius: '0.25rem', resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ color: 'var(--panel-text)', fontSize: '0.875rem' }}>Desired Outcome</label>
        <textarea 
          value={desiredOutcome} 
          onChange={(e) => onUpdate('desiredOutcome', e.target.value)}
          rows={3}
          style={{ background: 'var(--panel-input-bg)', color: 'var(--panel-text)', border: '1px solid var(--panel-input-border)', padding: '0.5rem', borderRadius: '0.25rem', resize: 'vertical' }}
        />
      </div>
    </div>
  );
};
