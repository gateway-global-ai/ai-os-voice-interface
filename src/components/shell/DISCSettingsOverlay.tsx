import { Activity } from 'lucide-react';
import type { DISCProfile } from '../../shell/appTypes';
import { SovereignButton, SovereignCard, SovereignDescription, SovereignTitle } from '../../ui-core';

export function DISCSettingsOverlay({ 
  profile, 
  onChange, 
  onClose, 
}: { 
  profile: DISCProfile; 
  onChange: (key: keyof DISCProfile, value: number) => void; 
  onClose: () => void;
}) {
  const traits: { key: keyof DISCProfile; label: string; color: string; description: string }[] = [
    { key: 'dominance', label: 'Dominance', color: '#10B981', description: 'Direct, results-oriented, and firm' },
    { key: 'influence', label: 'Influence', color: '#34D399', description: 'Outgoing, enthusiastic, and optimistic' },
    { key: 'steadiness', label: 'Steadiness', color: '#059669', description: 'Patient, accommodating, and humble' },
    { key: 'conscientiousness', label: 'Conscientiousness', color: '#6EE7B7', description: 'Analytical, reserved, and precise' },
  ];

  const size = 200;
  const center = size / 2;
  const radius = size * 0.4;
  const getPoint = (value: number, angle: number) => {
    const r = (value / 10) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  };
  const points = traits.map((t, i) => getPoint(profile[t.key], (i * Math.PI * 2) / 4 - Math.PI / 2)).join(' ');

  return (
    <SovereignCard className="relative z-20 w-full mx-0 flex flex-col md:flex-row gap-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
      <div className="flex-1">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-2xl mb-4">
            <Activity className="w-6 h-6 text-emerald-600" />
          </div>
          <SovereignTitle level={2}>DISC Profile</SovereignTitle>
          <SovereignDescription>Adjust my behavioral personality traits</SovereignDescription>
        </div>

        <div className="space-y-6">
          {traits.map((trait) => (
            <div key={trait.key} className="space-y-2">
              <div className="flex justify-between items-end">
                <div>
                  <span className="font-bold" style={{ color: 'var(--panel-heading)' }}>{trait.label}</span>
                  <p className="mt-1 text-[10px] leading-none" style={{ color: 'var(--panel-text-muted)' }}>{trait.description}</p>
                </div>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-sm font-black text-emerald-400">{profile[trait.key]}</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="1"
                value={profile[trait.key]}
                onChange={(e) => onChange(trait.key, parseInt(e.target.value, 10))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                style={{ background: 'var(--panel-surface)' }}
              />
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6" style={{ borderTop: '1px solid var(--panel-border)' }}>
          <SovereignButton onClick={onClose} variant="primary" className="w-full">
            Save Profile
          </SovereignButton>
        </div>
      </div>

      <div
        className="w-full md:w-80 flex flex-col items-center justify-center rounded-[2rem] p-8"
        style={{ background: 'var(--panel-surface)', border: '1px solid var(--panel-border)' }}
      >
        <div className="relative w-full aspect-square flex items-center justify-center">
          <svg width={size} height={size} className="overflow-visible">
            {[2, 4, 6, 8, 10].map((v) => (
              <circle key={v} cx={center} cy={center} r={(v / 10) * radius} fill="none" stroke="rgba(148,163,184,0.28)" strokeWidth="1" />
            ))}
            {traits.map((_, i) => {
              const angle = (i * Math.PI * 2) / 4 - Math.PI / 2;
              return (
                <line
                  key={i}
                  x1={center}
                  y1={center}
                  x2={center + radius * Math.cos(angle)}
                  y2={center + radius * Math.sin(angle)}
                  stroke="rgba(148,163,184,0.28)"
                  strokeWidth="1"
                />
              );
            })}
            <polygon points={points} fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" strokeWidth="3" strokeLinejoin="round" />
            {traits.map((t, i) => {
              const angle = (i * Math.PI * 2) / 4 - Math.PI / 2;
              const x = center + (radius + 25) * Math.cos(angle);
              const y = center + (radius + 25) * Math.sin(angle);
              return (
                <text key={t.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-current text-[10px] font-black uppercase tracking-tighter" style={{ color: 'var(--panel-text-muted)' }}>
                  {t.label[0]}
                </text>
              );
            })}
          </svg>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 w-full">
          {traits.map((t) => (
            <div key={t.key} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--panel-text-muted)' }}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </SovereignCard>
  );
}
