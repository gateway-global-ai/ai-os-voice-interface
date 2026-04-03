/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  FormEvent,
  type MutableRefObject,
  type PointerEvent,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eye, 
  User,
  LogIn,
  UserPlus,
  Settings,
  Building2,
  FileText,
  Table,
  Presentation,
  Calendar,
  Video,
  Layout,
  Volume2,
  Check,
  Activity,
  Sliders,
  Target,
  Zap,
  Flag,
  Briefcase,
  UserCheck
} from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import { GovernanceDocumentListSurface } from './overlays/GovernanceDocumentListSurface';
import {
  DiscussDocumentsSurface,
  GovernanceHubSurface,
  PlanningAssistantSurface,
  ResearchAssistantSurface,
  ReviewDocsSurface,
} from './overlays/GovernanceWorkSurfaces';
import { DocumentViewerOverlay } from './overlays/DocumentViewer';
import { ConflictScanOverlay } from './overlays/ConflictScan';
import { ComplianceCheckOverlay } from './overlays/ComplianceCheck';
import { LifecyclePanelOverlay } from './overlays/LifecyclePanel';
import { AmendmentHubSurface } from './overlays/AmendmentHubSurface';
import { AmendmentWorkflowSurface } from './overlays/AmendmentWorkflowSurface';
import { ActionPlanReviewSurface } from './overlays/ActionPlanReviewSurface';
import { WorkspaceHubSurface } from './overlays/WorkspaceHubSurface';
import { WorkspaceOnboardingSurface } from './overlays/WorkspaceOnboardingSurface';
import { ApiHealthOverlay } from './overlays/ApiHealthOverlay';
import { stripIntentLineForDisplay } from './governance/intentParse';
import { GovernanceCanvasProvider, useGovernanceCanvas } from './governance/GovernanceCanvasContext';
import { CommandRail, type CommandRailState } from './components/shell/CommandRail';
import { ShellIdentityBar } from './components/shell/ShellIdentityBar';
import { routeShellAgentText } from './shell/shellIntentRouter';
import { resolveWorkspaceState, setWorkspaceUserConnected } from './shell/workspaceState';

type SystemStatus =
  | "connected"
  | "listening"
  | "processing"
  | "speaking"
  | "error"
  | "offline";

type AppMode =
  | "voice"
  | "chat"
  | "visual"
  | "menu"
  | "voice_settings"
  | "disc_settings"
  | "intent_settings"
  | "api_health";

/** Governance uses canvas state (intent outputs), not AppMode — see govCanvas below. */

interface Message {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

interface DISCProfile {
  dominance: number;
  influence: number;
  steadiness: number;
  conscientiousness: number;
}

const VoiceSettingsOverlay = ({ 
  currentVoice, 
  onSelect, 
  onClose 
}: { 
  currentVoice: string; 
  onSelect: (voice: string) => void; 
  onClose: () => void;
}) => {
  const voices = [
    { id: 'Kore', name: 'Kore', description: 'Balanced and professional' },
    { id: 'Puck', name: 'Puck', description: 'Energetic and bright' },
    { id: 'Charon', name: 'Charon', description: 'Deep and authoritative' },
    { id: 'Fenrir', name: 'Fenrir', description: 'Warm and calm' },
    { id: 'Zephyr', name: 'Zephyr', description: 'Light and airy' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative z-20 w-full md:max-w-2xl lg:max-w-5xl mx-0 md:mx-4 p-6 md:p-10 rounded-none md:rounded-[2.5rem] bg-white/80 backdrop-blur-2xl border-y md:border border-zinc-200 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)]"
    >
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-2xl mb-4">
          <Volume2 className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Voice Settings</h2>
        <p className="text-zinc-500 mt-1 text-sm">Select your preferred system voice</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {voices.map((voice) => (
          <button
            key={voice.id}
            onClick={() => onSelect(voice.id)}
            className={`w-full flex flex-col items-start gap-2 p-5 rounded-2xl border transition-all relative ${
              currentVoice === voice.id 
                ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
                : 'bg-white/50 border-zinc-100 hover:bg-zinc-50'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`font-bold text-lg ${currentVoice === voice.id ? 'text-emerald-700' : 'text-zinc-900'}`}>
                {voice.name}
              </span>
              {currentVoice === voice.id && (
                <div className="bg-emerald-500 rounded-full p-1">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <span className="text-xs text-zinc-500 leading-tight text-left">{voice.description}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-zinc-100">
        <button 
          onClick={onClose}
          className="w-full py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-all"
        >
          Done
        </button>
      </div>
    </motion.div>
  );
};

const DISCSettingsOverlay = ({ 
  profile, 
  onChange, 
  onClose 
}: { 
  profile: DISCProfile; 
  onChange: (key: keyof DISCProfile, value: number) => void; 
  onClose: () => void;
}) => {
  const traits: { key: keyof DISCProfile; label: string; color: string; description: string }[] = [
    { key: 'dominance', label: 'Dominance', color: '#EF4444', description: 'Direct, results-oriented, and firm' },
    { key: 'influence', label: 'Influence', color: '#F59E0B', description: 'Outgoing, enthusiastic, and optimistic' },
    { key: 'steadiness', label: 'Steadiness', color: '#10B981', description: 'Patient, accommodating, and humble' },
    { key: 'conscientiousness', label: 'Conscientiousness', color: '#3B82F6', description: 'Analytical, reserved, and precise' },
  ];

  // Simple Radar Chart Calculation
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
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative z-20 w-full md:max-w-4xl lg:max-w-6xl mx-0 md:mx-4 p-6 md:p-10 rounded-none md:rounded-[2.5rem] bg-white/80 backdrop-blur-2xl border-y md:border border-zinc-200 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] flex flex-col md:flex-row gap-10 max-h-screen overflow-y-auto custom-scrollbar"
    >
      <div className="flex-1">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-2xl mb-4">
            <Activity className="w-6 h-6 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">DISC Profile</h2>
          <p className="text-zinc-500 mt-1 text-sm">Adjust my behavioral personality traits</p>
        </div>

        <div className="space-y-6">
          {traits.map((trait) => (
            <div key={trait.key} className="space-y-2">
              <div className="flex justify-between items-end">
                <div>
                  <span className="font-bold text-zinc-900">{trait.label}</span>
                  <p className="text-[10px] text-zinc-400 leading-none mt-1">{trait.description}</p>
                </div>
                <span className="text-sm font-black text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-md">{profile[trait.key]}</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="1"
                value={profile[trait.key]}
                onChange={(e) => onChange(trait.key, parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-zinc-100">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-zinc-900 text-white font-bold rounded-2xl hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10"
          >
            Save Profile
          </button>
        </div>
      </div>

      <div className="w-full md:w-80 flex flex-col items-center justify-center bg-zinc-50 rounded-[2rem] p-8 border border-zinc-100">
        <div className="relative w-full aspect-square flex items-center justify-center">
          <svg width={size} height={size} className="overflow-visible">
            {/* Background Circles */}
            {[2, 4, 6, 8, 10].map((v) => (
              <circle 
                key={v} 
                cx={center} 
                cy={center} 
                r={(v / 10) * radius} 
                fill="none" 
                stroke="#e4e4e7" 
                strokeWidth="1" 
              />
            ))}
            {/* Axis Lines */}
            {traits.map((_, i) => {
              const angle = (i * Math.PI * 2) / 4 - Math.PI / 2;
              return (
                <line 
                  key={i}
                  x1={center}
                  y1={center}
                  x2={center + radius * Math.cos(angle)}
                  y2={center + radius * Math.sin(angle)}
                  stroke="#e4e4e7"
                  strokeWidth="1"
                />
              );
            })}
            {/* Data Polygon */}
            <polygon 
              points={points} 
              fill="rgba(16, 185, 129, 0.2)" 
              stroke="#10b981" 
              strokeWidth="3" 
              strokeLinejoin="round"
            />
            {/* Labels */}
            {traits.map((t, i) => {
              const angle = (i * Math.PI * 2) / 4 - Math.PI / 2;
              const x = center + (radius + 25) * Math.cos(angle);
              const y = center + (radius + 25) * Math.sin(angle);
              return (
                <text 
                  key={t.key}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[10px] font-black uppercase tracking-tighter fill-zinc-400"
                >
                  {t.label[0]}
                </text>
              );
            })}
          </svg>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 w-full">
          {traits.map(t => (
            <div key={t.key} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const IntentSettingsOverlay = ({ 
  agentIntent, 
  userIntent, 
  desiredOutcome,
  agentName,
  agentCompany,
  agentRole,
  onAgentIntentChange, 
  onUserIntentChange, 
  onDesiredOutcomeChange,
  onAgentNameChange,
  onAgentCompanyChange,
  onAgentRoleChange,
  onClose 
}: { 
  agentIntent: string; 
  userIntent: string; 
  desiredOutcome: string;
  agentName: string;
  agentCompany: string;
  agentRole: string;
  onAgentIntentChange: (val: string) => void; 
  onUserIntentChange: (val: string) => void; 
  onDesiredOutcomeChange: (val: string) => void;
  onAgentNameChange: (val: string) => void;
  onAgentCompanyChange: (val: string) => void;
  onAgentRoleChange: (val: string) => void;
  onClose: () => void;
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative z-20 w-full md:max-w-2xl lg:max-w-5xl mx-0 md:mx-4 p-6 md:p-10 rounded-none md:rounded-[2.5rem] bg-white/80 backdrop-blur-2xl border-y md:border border-zinc-200 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)]"
    >
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-2xl mb-4">
          <Target className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">System Configuration</h2>
        <p className="text-zinc-500 mt-1 text-sm">Define the identity and objectives for this session</p>
      </div>

      <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {/* Identity Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-emerald-500" />
            <label className="text-sm font-black text-zinc-900 uppercase tracking-widest">Agent Identity</label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Name</label>
              <input 
                type="text"
                value={agentName}
                onChange={(e) => onAgentNameChange(e.target.value)}
                placeholder="Agent Name"
                className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-900 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Company</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                <input 
                  type="text"
                  value={agentCompany}
                  onChange={(e) => onAgentCompanyChange(e.target.value)}
                  placeholder="Company"
                  className="w-full p-4 pl-11 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-900 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Role</label>
              <div className="relative">
                <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                <input 
                  type="text"
                  value={agentRole}
                  onChange={(e) => onAgentRoleChange(e.target.value)}
                  placeholder="Role"
                  className="w-full p-4 pl-11 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-900 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-zinc-100" />

        {/* Intent Section */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-emerald-500" />
              <label className="text-sm font-black text-zinc-900 uppercase tracking-widest">Agent Intent</label>
            </div>
            <textarea 
              value={agentIntent}
              onChange={(e) => onAgentIntentChange(e.target.value)}
              placeholder="What is the agent's primary goal? (e.g., Be a proactive assistant that anticipates needs...)"
              className="w-full h-20 md:h-24 p-4 md:p-5 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-900 resize-none text-sm md:text-base"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-emerald-500" />
              <label className="text-sm font-black text-zinc-900 uppercase tracking-widest">User Intent</label>
            </div>
            <textarea 
              value={userIntent}
              onChange={(e) => onUserIntentChange(e.target.value)}
              placeholder="What is the user trying to achieve? (e.g., I want to organize my schedule and clear my inbox...)"
              className="w-full h-20 md:h-24 p-4 md:p-5 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-900 resize-none text-sm md:text-base"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Flag className="w-4 h-4 text-emerald-500" />
              <label className="text-sm font-black text-zinc-900 uppercase tracking-widest">Desired Outcome</label>
            </div>
            <textarea 
              value={desiredOutcome}
              onChange={(e) => onDesiredOutcomeChange(e.target.value)}
              placeholder="What is the definition of success for this session? (e.g., A finalized itinerary for the weekend trip...)"
              className="w-full h-20 md:h-24 p-4 md:p-5 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-900 resize-none text-sm md:text-base"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 md:mt-10 pt-6 md:pt-8 border-t border-zinc-100 flex flex-col md:flex-row gap-3 md:gap-4">
        <button 
          onClick={onClose}
          className="w-full md:flex-1 py-4 bg-zinc-100 text-zinc-900 font-bold rounded-2xl hover:bg-zinc-200 transition-all order-2 md:order-1"
        >
          Cancel
        </button>
        <button 
          onClick={onClose}
          className="w-full md:flex-[2] py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 order-1 md:order-2"
        >
          Apply Configuration
        </button>
      </div>
    </motion.div>
  );
};

// --- Components ---

/** Voice pipeline: emerald = listening + speaking; amber/yellow = reasoning (processing). */
function OrbitalPalette(status: SystemStatus): {
  barMuted: string;
  barPeak: string;
  glow: string;
  logoBg: string;
  logoText: string;
  statusLabel: string;
  statusDetail: string;
  statusHeadingClass: string;
} {
  switch (status) {
    case 'listening':
      return {
        barMuted: '#34d399',
        barPeak: '#059669',
        glow: 'rgba(16, 185, 129, 0.18)',
        logoBg: 'bg-emerald-500',
        logoText: 'text-white',
        statusLabel: 'Listening',
        statusDetail: 'Capturing your voice',
        statusHeadingClass: 'text-emerald-600',
      };
    case 'processing':
      return {
        barMuted: '#fde047',
        barPeak: '#eab308',
        glow: 'rgba(234, 179, 8, 0.2)',
        logoBg: 'bg-amber-400',
        logoText: 'text-amber-950',
        statusLabel: 'Reasoning',
        statusDetail: 'Model is thinking',
        statusHeadingClass: 'text-amber-600',
      };
    case 'speaking':
      return {
        barMuted: '#34d399',
        barPeak: '#059669',
        glow: 'rgba(16, 185, 129, 0.2)',
        logoBg: 'bg-emerald-500',
        logoText: 'text-white',
        statusLabel: 'Speaking',
        statusDetail: 'Voice response',
        statusHeadingClass: 'text-emerald-600',
      };
    case 'error':
      return {
        barMuted: '#fca5a5',
        barPeak: '#ef4444',
        glow: 'rgba(239, 68, 68, 0.15)',
        logoBg: 'bg-red-500',
        logoText: 'text-white',
        statusLabel: 'Error',
        statusDetail: 'Something went wrong',
        statusHeadingClass: 'text-red-600',
      };
    case 'offline':
      return {
        barMuted: '#a1a1aa',
        barPeak: '#71717a',
        glow: 'rgba(113, 113, 122, 0.12)',
        logoBg: 'bg-zinc-400',
        logoText: 'text-white',
        statusLabel: 'Offline',
        statusDetail: 'Voice unavailable',
        statusHeadingClass: 'text-zinc-500',
      };
    default:
      return {
        barMuted: '#6ee7b7',
        barPeak: '#10b981',
        glow: 'rgba(16, 185, 129, 0.08)',
        logoBg: 'bg-emerald-500',
        logoText: 'text-white',
        statusLabel: 'Ready',
        statusDetail: 'Tap and hold to speak',
        statusHeadingClass: 'text-emerald-600',
      };
  }
}

const OrbitalVisualizer = ({ isActive, status }: { isActive: boolean; status: SystemStatus }) => {
  const bars = 48;
  const palette = OrbitalPalette(status);

  return (
    <div className="relative w-32 h-40 md:w-40 md:h-48 shrink-0">
      {/* Central Logo + live system state — pinned to true center (matches bar hub) */}
      <div className="absolute left-1/2 top-1/2 z-10 w-full -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center text-center px-0.5">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-center gap-0.5">
            <span className="text-zinc-400 font-bold text-xs md:text-sm tracking-widest">AI</span>
            <div
              className={`${palette.logoBg} ${palette.logoText} px-1 py-px rounded text-xs md:text-sm font-bold transition-colors duration-300`}
            >
              O
            </div>
            <div
              className={`${palette.logoBg} ${palette.logoText} px-1 py-px rounded text-xs md:text-sm font-bold transition-colors duration-300`}
            >
              S
            </div>
          </div>
          <div className="flex flex-col items-center text-center max-w-[9rem] md:max-w-[11rem] mx-auto">
            <span
              className={`inline-block pl-[0.15em] text-[8px] md:text-[10px] font-black uppercase tracking-[0.18em] tabular-nums ${palette.statusHeadingClass}`}
            >
              {palette.statusLabel}
            </span>
            <span className="text-[8px] md:text-[9px] text-zinc-500 mt-px leading-tight font-medium px-0.5">
              {palette.statusDetail}
            </span>
          </div>
        </div>
      </div>

      {/* Animated Bars — hub at container center */}
      <div className="absolute inset-0 z-[1] overflow-visible">
        {Array.from({ length: bars }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 md:w-1 rounded-full left-1/2 bottom-1/2"
            style={{
              height: '24%',
              transform: `translateX(-50%) rotate(${(i * 360) / bars}deg) translateY(-108%)`,
              transformOrigin: 'bottom center',
            }}
            animate={isActive ? {
              height: [
                '24%',
                `${24 + Math.random() * 28}%`,
                '24%'
              ],
              opacity: [0.45, 1, 0.45],
              backgroundColor: [palette.barMuted, palette.barPeak, palette.barMuted],
            } : {
              height: '24%',
              opacity: 0.18,
              backgroundColor: palette.barMuted,
            }}
            transition={{
              duration: 0.5 + Math.random() * 0.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Glow Effect — centered on hub, behind bars */}
      <motion.div
        className="absolute left-1/2 top-1/2 z-0 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl pointer-events-none"
        style={{ backgroundColor: palette.glow }}
        animate={isActive ? {
          scale: [1, 1.06, 1],
          opacity: [0.28, 0.65, 0.28]
        } : {
          scale: 1,
          opacity: 0.2
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
  );
};

const CrystalOverlay = ({ onClose }: { onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="relative z-20 w-full md:max-w-2xl lg:max-w-5xl mx-0 md:mx-4 p-6 md:p-10 rounded-none md:rounded-[2.5rem] bg-white/80 backdrop-blur-2xl border-y md:border border-zinc-200 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] text-center"
  >
    <div className="mb-8 flex justify-center">
      <div className="w-16 h-1 bg-emerald-500/20 rounded-full" />
    </div>
    <h2 className="text-4xl font-bold text-zinc-900 mb-6 tracking-tight">Welcome to AI OS</h2>
    <p className="text-zinc-600 text-lg leading-relaxed mb-10 max-w-lg mx-auto">
      AI OS is an intent-driven application that is primarily voice-driven. 
      If you are unable to use your microphone, you can use this mode to display menu options, 
      helper overlays, and visual content.
    </p>
    <button 
      onClick={onClose}
      className="px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-emerald-500/20"
    >
      Get Started
    </button>
  </motion.div>
);

const MenuOverlay = ({ 
  onOpenVoiceSettings, 
  onOpenDISCSettings,
  onOpenIntentSettings,
  onOpenApiHealth,
  onToggleVisual,
  onOpenWorkspaceGate,
  onOpenGovernance,
  currentMode,
  governanceCanvasOpen,
  workspaceSurfaceOpen,
}: { 
  onOpenVoiceSettings: () => void; 
  onOpenDISCSettings: () => void;
  onOpenIntentSettings: () => void;
  onOpenApiHealth: () => void;
  onToggleVisual: () => void;
  onOpenWorkspaceGate: () => void;
  onOpenGovernance: () => void;
  currentMode: string;
  governanceCanvasOpen: boolean;
  workspaceSurfaceOpen: boolean;
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    className="relative z-20 w-full md:max-w-md lg:max-w-2xl mx-0 md:mx-4 p-6 md:p-8 rounded-none md:rounded-[2rem] bg-white/80 backdrop-blur-2xl border-y md:border border-zinc-200 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)]"
  >
    <div className="flex items-center gap-4 mb-8">
      <div className="p-3 bg-emerald-500/10 rounded-2xl">
        <Settings className="w-6 h-6 text-emerald-600" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-zinc-900 tracking-tight">System Options</h2>
        <p className="text-zinc-500 text-sm">Manage your AI OS experience</p>
      </div>
    </div>

    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
        <div 
          onClick={onToggleVisual}
          className={`p-4 rounded-2xl border transition-all cursor-pointer group ${currentMode === 'visual' ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100'}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Eye className={`w-4 h-4 ${currentMode === 'visual' ? 'text-emerald-600' : 'text-zinc-400 group-hover:text-emerald-600'}`} />
            <h3 className={`text-sm font-semibold transition-colors ${currentMode === 'visual' ? 'text-emerald-600' : 'text-zinc-900'}`}>Visual</h3>
          </div>
          <p className="text-[10px] text-zinc-500 leading-tight">Toggle canvas visualization</p>
        </div>

        <div 
          onClick={onOpenWorkspaceGate}
          className={`p-4 rounded-2xl border transition-all cursor-pointer group ${workspaceSurfaceOpen ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100'}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Building2 className={`w-4 h-4 ${workspaceSurfaceOpen ? 'text-emerald-600' : 'text-zinc-400 group-hover:text-emerald-600'}`} />
            <h3 className={`text-sm font-semibold transition-colors ${workspaceSurfaceOpen ? 'text-emerald-600' : 'text-zinc-900'}`}>Workspace</h3>
          </div>
          <p className="text-[10px] text-zinc-500 leading-tight">Google Workspace (governed gate)</p>
        </div>

        <div 
          onClick={onOpenGovernance}
          className={`p-4 rounded-2xl border transition-all cursor-pointer group sm:col-span-1 col-span-2 ${governanceCanvasOpen ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100'}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <FileText className={`w-4 h-4 ${governanceCanvasOpen ? 'text-emerald-600' : 'text-zinc-400 group-hover:text-emerald-600'}`} />
            <h3 className={`text-sm font-semibold transition-colors ${governanceCanvasOpen ? 'text-emerald-600' : 'text-zinc-900'}`}>Governance</h3>
          </div>
          <p className="text-[10px] text-zinc-500 leading-tight">Intent surfaces — documents, compliance</p>
        </div>
      </div>

      <div 
        onClick={onOpenVoiceSettings}
        className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 transition-all cursor-pointer group"
      >
        <h3 className="text-zinc-900 font-semibold group-hover:text-emerald-600 transition-colors">Personalization</h3>
        <p className="text-zinc-500 text-xs mt-1">Adjust voice and interface preferences</p>
      </div>

      <div 
        onClick={onOpenDISCSettings}
        className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 transition-all cursor-pointer group"
      >
        <h3 className="text-zinc-900 font-semibold group-hover:text-emerald-600 transition-colors">DISC Profile</h3>
        <p className="text-zinc-500 text-xs mt-1">Configure behavioral personality traits</p>
      </div>

      <div 
        onClick={onOpenIntentSettings}
        className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 transition-all cursor-pointer group"
      >
        <h3 className="text-zinc-900 font-semibold group-hover:text-emerald-600 transition-colors">System Configuration</h3>
        <p className="text-zinc-500 text-xs mt-1">Define identity and objectives</p>
      </div>

      <div 
        onClick={onOpenApiHealth}
        className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-4 h-4 text-zinc-400 group-hover:text-emerald-600" />
          <h3 className="text-zinc-900 font-semibold group-hover:text-emerald-600 transition-colors">API health</h3>
        </div>
        <p className="text-zinc-500 text-xs mt-1">Test Gemini, OpenAI, DeepSeek & Governance API</p>
      </div>
      
      <div className="grid grid-cols-2 gap-3 pt-6 mt-4 border-t border-zinc-100">
        <button className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-400 transition-all hover:scale-[1.02] active:scale-[0.98]">
          <LogIn className="w-4 h-4" />
          Login
        </button>
        <button className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-zinc-100 text-zinc-900 font-bold hover:bg-zinc-200 border border-zinc-200 transition-all hover:scale-[1.02] active:scale-[0.98]">
          <UserPlus className="w-4 h-4" />
          Join
        </button>
      </div>
    </div>
  </motion.div>
);

function AppImpl({
  speakTextRef,
}: {
  speakTextRef: MutableRefObject<(text: string, overrideVoice?: string) => Promise<void>>;
}) {
  const {
    canvas: govCanvas,
    payload,
    dataPhase,
    dataError,
    lifecycleBusy,
    loadData,
    retryLoadData,
    applyAmendmentWorkflowRun,
    refreshLifecycleSelection,
    closeCanvas,
    goBack,
    dismissBackdrop,
    applyAgentIntent,
  } = useGovernanceCanvas();

  const [mode, setMode] = useState<AppMode>("voice");
  const [status, setStatus] = useState<SystemStatus>("connected");
  const [isPTTActive, setIsPTTActive] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'agent', text: 'Welcome back. How can I help you today?', timestamp: new Date() }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [workspaceConnecting, setWorkspaceConnecting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const workspaceDisclosure = useMemo(
    () => resolveWorkspaceState({ isConnecting: workspaceConnecting }),
    [workspaceConnecting, govCanvas, payload]
  );

  
  // Speech Recognition Ref — PTT only: never transcribe unless a push session is active
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  /** True only while the user is holding PTT (survives re-renders; drives onresult + onend). */
  const pttSessionActiveRef = useRef(false);
  /** Latest transcript for finalize (React state can lag behind onresult). */
  const transcriptRef = useRef('');

  // Audio Context for TTS
  const audioContextRef = useRef<AudioContext | null>(null);

  // Voice State
  const [voice, setVoice] = useState('Kore');

  // DISC Profile State
  const [discProfile, setDiscProfile] = useState<DISCProfile>({
    dominance: 5,
    influence: 7,
    steadiness: 6,
    conscientiousness: 8
  });

  // Intent State
  const [agentIntent, setAgentIntent] = useState(
    "You help manage AIOS governing documents. Be concise and voice-friendly. Open governance only via INTENT_JSON (never promise a raw dashboard). governance.documents.list opens the founder intent hub (work modes: Review Docs, Discuss, Planning, Research, Amendment Program, Action plan); the library appears inside those modes when needed. governance.amendment.workflow opens the amendment program (simulated peer review and plan; no automatic merge). governance.action_plan.review opens impact-report action planning; optional document_id = sources folder name."
  );
  const [userIntent, setUserIntent] = useState("Organize my digital life, manage my schedule, and help me stay focused on my core goals.");
  const [desiredOutcome, setDesiredOutcome] = useState("A successful interaction where the user's needs are met efficiently and the agent provides proactive value.");
  const [agentName, setAgentName] = useState("AIOS Governance Agent");
  const [agentCompany, setAgentCompany] = useState("Gateway Global");
  const [agentRole, setAgentRole] = useState("Governance Document Authority");

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, mode]);

  useEffect(() => {
    // Initialize Speech Recognition (start/stop only from PTT handlers)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      // Keep one session per PTT press (pause-tolerant); stop() ends it. continuous=false would drop earlier words on onend restart.
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        if (!isListeningRef.current || !pttSessionActiveRef.current) {
          return;
        }
        let currentTranscription = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscription += event.results[i][0].transcript;
        }
        transcriptRef.current = currentTranscription;
        setTranscription(currentTranscription);
      };

      recognitionRef.current.onerror = (event: any) => {
        // no-speech / aborted: normal; audio-capture: often transient race with the mic pipeline
        const benign =
          event.error === 'no-speech' ||
          event.error === 'aborted' ||
          event.error === 'audio-capture';
        if (!benign) {
          console.error('Speech recognition error:', event.error);
        }
        if (!benign && pttSessionActiveRef.current) {
          setStatus('error');
        } else if (benign && pttSessionActiveRef.current) {
          setStatus('listening');
        }
      };

      recognitionRef.current.onend = () => {
        // With continuous=true, onend usually means stop() was called — do not restart unless PTT still held.
        if (!isListeningRef.current || !pttSessionActiveRef.current || !recognitionRef.current) {
          return;
        }
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.debug('Speech recognition restart skipped:', e);
        }
      };
    } else {
      console.warn('Speech recognition not supported in this browser.');
      setStatus("offline");
    }

    return () => {
      pttSessionActiveRef.current = false;
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          /* already stopped */
        }
      }
    };
  }, []);

  const runShellAndGovernancePipeline = (agentText: string) => {
    const { action, delegateGovernance } = routeShellAgentText(agentText);
    if (action.type !== 'none') {
      window.setTimeout(() => {
        if (action.type === 'set_mode') {
          setMode(action.mode);
        } else if (action.type === 'open_workspace') {
          void loadData('workspace_hub', undefined, { transitionMode: 'intent' });
        }
      }, 400);
    }
    if (delegateGovernance) {
      window.setTimeout(() => applyAgentIntent(agentText), 1000);
    }
  };

  const speakText = async (text: string, overrideVoice?: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say cheerfully: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: overrideVoice || voice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // The TTS model returns raw PCM with sample rate 24000
        const audioBuffer = ctx.createBuffer(1, bytes.length / 2, 24000);
        const channelData = audioBuffer.getChannelData(0);
        const view = new DataView(bytes.buffer);
        for (let i = 0; i < channelData.length; i++) {
          channelData[i] = view.getInt16(i * 2, true) / 32768;
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        
        setStatus("speaking");
        source.start();
        
        source.onended = () => {
          setStatus("connected");
          setTranscription("");
        };
      }
    } catch (err) {
      console.error('TTS error:', err);
      setStatus("error");
      setTimeout(() => setStatus("connected"), 3000);
    }
  };

  speakTextRef.current = speakText;

  const handleVoiceSelect = async (newVoice: string) => {
    setVoice(newVoice);
    setMode('voice');
    const confirmationText = `Voice changed to ${newVoice}. How does this sound?`;
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'agent',
      text: confirmationText,
      timestamp: new Date()
    }]);
    await speakText(confirmationText, newVoice);
  };

  const handleDISCChange = (key: keyof DISCProfile, value: number) => {
    setDiscProfile(prev => ({ ...prev, [key]: value }));
  };

  const handlePTTDown = async (e: PointerEvent<HTMLButtonElement>) => {
    if (!recognitionRef.current) {
      setStatus("error");
      return;
    }
    // Primary button only (mouse); touch/pen use button id 0
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (capErr) {
        console.warn('Pointer capture unavailable (PTT still works):', capErr);
      }

      transcriptRef.current = '';
      setTranscription('Listening...');
      setIsPTTActive(true);
      pttSessionActiveRef.current = true;
      setStatus('listening');
      isListeningRef.current = true;

      const rec = recognitionRef.current;
      try {
        rec.start();
      } catch (startErr: unknown) {
        const se = startErr as { name?: string };
        // Engine already has an active session (e.g. race with onend). Keep PTT state — audio may already work.
        if (se?.name === 'InvalidStateError') {
          console.debug('Speech recognition already active — continuing PTT');
          return;
        }
        console.error('Speech recognition start failed:', startErr);
        pttSessionActiveRef.current = false;
        isListeningRef.current = false;
        setIsPTTActive(false);
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* */
        }
        setStatus('error');
      }
    } catch (err) {
      console.error('Microphone access denied:', err);
      setStatus('error');
    }
  };

  const endPTTSession = async () => {
    if (!pttSessionActiveRef.current) return;
    pttSessionActiveRef.current = false;
    setIsPTTActive(false);
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* */
      }
    }

    const finalTranscription = transcriptRef.current.trim();
    transcriptRef.current = '';

    if (!finalTranscription || finalTranscription === 'Listening...') {
      setStatus('connected');
      setTranscription('');
      return;
    }

    setStatus("processing");
    
    try {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'user',
        text: finalTranscription,
        timestamp: new Date()
      }]);

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: finalTranscription,
        config: {
          systemInstruction: `You are ${agentName}, representing ${agentCompany} in your role as ${agentRole}. You are a helpful, concise, and intent-driven voice assistant. Keep responses brief and conversational. 
          
          AGENT IDENTITY: Name: ${agentName}, Company: ${agentCompany}, Role: ${agentRole}
          AGENT INTENT: ${agentIntent}
          USER INTENT: ${userIntent}
          DESIRED OUTCOME: ${desiredOutcome}
          DISC PROFILE: D:${discProfile.dominance}, I:${discProfile.influence}, S:${discProfile.steadiness}, C:${discProfile.conscientiousness}

          SHELL (app intents): After your spoken reply, add exactly one final line: INTENT_JSON:{...} with no markdown fence.
          For voice preferences: INTENT_JSON:{"intent":"app.open.voice_settings"}
          For DISC profile UI: INTENT_JSON:{"intent":"app.open.disc_settings"}
          For identity / system configuration: INTENT_JSON:{"intent":"app.open.intent_settings"}
          To open the governed Workspace gate: INTENT_JSON:{"intent":"app.open.workspace","target":"workspace.hub"}

          GOVERNANCE CANVAS (structured intent): Same INTENT_JSON line when opening governance/workspace surfaces:
          INTENT_JSON:{"intent":"<id>","document_id":""}
          intent must be exactly one of: none | governance.documents.list | governance.documents.open | governance.amendment.workflow | governance.action_plan.review | governance.conflicts.scan | governance.compliance.check | governance.lifecycle.status | workspace.hub | workspace.calendar.list | workspace.calendar.get | workspace.mail.search | workspace.mail.read | workspace.drive.search | workspace.drive.read | workspace.docs.read | workspace.docs.export | workspace.contacts.search | workspace.tasks.list | workspace.tasks.get
          Use intent "none" when no governance or workspace surface should open.
          governance.documents.list opens the governance intent hub (founder work modes — Review Docs, Discuss Documents, Planning Assistant, Research Assistant, Amendment Program, Action plan, Google Workspace), not the full document library by itself.
          governance.amendment.workflow opens the amendment program workflow (demo: AMD-2026-004 template; no repo merge).
          governance.action_plan.review opens action plan review; use document_id for sources folder name (e.g. AMD-2026-a10b9a).
          Use governance.documents.open with document_id when the user names an id (e.g. AIOS-CORE-001). Omit document_id or use "" if unknown.
          Workspace (AIOS-SPEC-007 Phase 1): workspace.* intents are governed — they route through the Integration Control Plane, not raw MCP. workspace.hub opens the Workspace hub; calendar list/get open the Calendar read-plane hub; other Phase 1 intents open the Workspace hub.`,
        }
      });

      const agentText = response.text || "I'm sorry, I couldn't process that.";
      const displayText = stripIntentLineForDisplay(agentText);
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        text: displayText,
        timestamp: new Date()
      }]);

      await speakText(displayText);

      runShellAndGovernancePipeline(agentText);

    } catch (err) {
      console.error('Gemini API error:', err);
      setStatus("error");
      setTimeout(() => setStatus("connected"), 3000);
    }
  };

  const handlePTTUp = async (e: PointerEvent<HTMLButtonElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* not capturing */
    }
    await endPTTSession();
  };

  const handleChatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatInput("");

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setStatus("processing");

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userText,
        config: {
          systemInstruction: `You are ${agentName}, representing ${agentCompany} in your role as ${agentRole}. You are a helpful, concise, and intent-driven voice assistant. Keep responses brief and conversational. 
          
          AGENT IDENTITY: Name: ${agentName}, Company: ${agentCompany}, Role: ${agentRole}
          AGENT INTENT: ${agentIntent}
          USER INTENT: ${userIntent}
          DESIRED OUTCOME: ${desiredOutcome}
          DISC PROFILE: D:${discProfile.dominance}, I:${discProfile.influence}, S:${discProfile.steadiness}, C:${discProfile.conscientiousness}

          SHELL (app intents): After your spoken reply, add exactly one final line: INTENT_JSON:{...} with no markdown fence.
          For voice preferences: INTENT_JSON:{"intent":"app.open.voice_settings"}
          For DISC profile UI: INTENT_JSON:{"intent":"app.open.disc_settings"}
          For identity / system configuration: INTENT_JSON:{"intent":"app.open.intent_settings"}
          To open the governed Workspace gate: INTENT_JSON:{"intent":"app.open.workspace","target":"workspace.hub"}

          GOVERNANCE CANVAS (structured intent): Same INTENT_JSON line when opening governance/workspace surfaces:
          INTENT_JSON:{"intent":"<id>","document_id":""}
          intent must be exactly one of: none | governance.documents.list | governance.documents.open | governance.amendment.workflow | governance.action_plan.review | governance.conflicts.scan | governance.compliance.check | governance.lifecycle.status | workspace.hub | workspace.calendar.list | workspace.calendar.get | workspace.mail.search | workspace.mail.read | workspace.drive.search | workspace.drive.read | workspace.docs.read | workspace.docs.export | workspace.contacts.search | workspace.tasks.list | workspace.tasks.get
          Use intent "none" when no governance or workspace surface should open.
          governance.documents.list opens the governance intent hub (founder work modes — Review Docs, Discuss Documents, Planning Assistant, Research Assistant, Amendment Program, Action plan, Google Workspace), not the full document library by itself.
          governance.amendment.workflow opens the amendment program workflow (demo: AMD-2026-004 template; no repo merge).
          governance.action_plan.review opens action plan review; use document_id for sources folder name (e.g. AMD-2026-a10b9a).
          Use governance.documents.open with document_id when the user names an id (e.g. AIOS-CORE-001). Omit document_id or use "" if unknown.
          Workspace (AIOS-SPEC-007 Phase 1): workspace.* intents are governed — they route through the Integration Control Plane, not raw MCP. workspace.hub opens the Workspace hub; calendar list/get open the Calendar read-plane hub; other Phase 1 intents open the Workspace hub.`,
        }
      });

      const agentText = response.text || "I'm sorry, I couldn't process that.";
      const displayText = stripIntentLineForDisplay(agentText);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        text: displayText,
        timestamp: new Date()
      }]);
      
      await speakText(displayText);

      runShellAndGovernancePipeline(agentText);
      
    } catch (err) {
      console.error('Gemini API error:', err);
      setStatus("error");
      setTimeout(() => setStatus("connected"), 3000);
    }
  };

  const workspaceSurfaceOpen =
    govCanvas?.view === 'workspace_hub' ||
    govCanvas?.view === 'workspace_onboarding' ||
    govCanvas?.view === 'workspace_calendar_hub' ||
    govCanvas?.view === 'workspace_mail_hub';

  const commandRail: CommandRailState = {
    mode: mode === 'chat' ? 'chat' : 'voice',
    primaryAction: mode === 'chat' ? 'send' : 'ptt',
    systemStatus:
      status === 'listening'
        ? 'listening'
        : status === 'processing'
          ? 'processing'
          : status === 'speaking'
            ? 'speaking'
            : 'idle',
    intent: govCanvas?.view ? `canvas:${govCanvas.view}` : undefined,
  };

  const statusDisplay =
    status === 'connected' ? 'ready' : status === 'offline' ? 'offline' : status;
  const statusTone: 'ok' | 'error' | 'muted' =
    status === 'error' ? 'error' : status === 'offline' ? 'muted' : 'ok';

  return (
    <div className="fixed inset-0 bg-white text-zinc-900 font-sans overflow-hidden selection:bg-emerald-500/30">
      {/* Background Grid */}
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      <ShellIdentityBar
        actorLabel="Founder"
        shellInteractionMode={mode === 'chat' ? 'chat' : 'voice'}
        actorModeLabel="Admin"
        workspaceState={workspaceDisclosure}
        intentSummary={govCanvas?.view ? `canvas:${govCanvas.view}` : undefined}
      />
      
      {/* Main Content Area */}
      <main className="relative z-[var(--z-shell-main)] h-full flex flex-col items-center justify-center pt-[var(--shell-header-height)] pb-[var(--shell-footer-height)]">
        <AnimatePresence mode="wait">
          {mode === 'voice' && (
            <motion.div 
              key="voice"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              {(status === 'processing' ||
                status === 'speaking' ||
                (isPTTActive && status === 'listening')) && (
                <OrbitalVisualizer isActive status={status} />
              )}
              
              {/* Transcription Display */}
              <div className="absolute bottom-40 w-full max-w-xl px-6 text-center">
                <AnimatePresence>
                  {transcription && (
                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-xl font-medium text-emerald-600 drop-shadow-sm"
                    >
                      {transcription}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {mode === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="absolute inset-0 flex flex-col bg-white/80 backdrop-blur-md"
            >
              <div className="flex-1 overflow-y-auto p-6 space-y-6 pt-12 pb-4">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] p-4 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-emerald-600 text-white rounded-tr-none shadow-lg shadow-emerald-600/10' 
                        : 'bg-zinc-100 text-zinc-900 rounded-tl-none border border-zinc-200'
                    }`}>
                      <p className="text-sm md:text-base">{msg.text}</p>
                      <span className="text-[10px] opacity-40 mt-2 block">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </motion.div>
          )}

          {mode === 'visual' && (
            <motion.div 
              key="visual"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-zinc-900/[0.02]"
            >
              <CrystalOverlay onClose={() => setMode('voice')} />
            </motion.div>
          )}

          {mode === 'menu' && (
            <motion.div 
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-zinc-900/[0.05] backdrop-blur-[2px]"
              onClick={() => setMode('voice')}
            >
              <div onClick={e => e.stopPropagation()}>
                <MenuOverlay 
                  onOpenVoiceSettings={() => setMode('voice_settings')} 
                  onOpenDISCSettings={() => setMode('disc_settings')}
                  onOpenIntentSettings={() => setMode('intent_settings')}
                  onOpenApiHealth={() => setMode('api_health')}
                  onToggleVisual={() => setMode(mode === 'visual' ? 'voice' : 'visual')}
                  onOpenWorkspaceGate={() => {
                    setMode('voice');
                    void loadData('workspace_hub', undefined, { transitionMode: 'intent' });
                  }}
                  onOpenGovernance={() => {
                    setMode('voice');
                    void loadData('governance_hub');
                  }}
                  currentMode={mode}
                  governanceCanvasOpen={govCanvas !== null}
                  workspaceSurfaceOpen={workspaceSurfaceOpen}
                />
              </div>
            </motion.div>
          )}

          {mode === 'voice_settings' && (
            <motion.div 
              key="voice_settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-zinc-900/[0.05] backdrop-blur-[2px]"
              onClick={() => setMode('voice')}
            >
              <div onClick={e => e.stopPropagation()}>
                <VoiceSettingsOverlay 
                  currentVoice={voice} 
                  onSelect={handleVoiceSelect} 
                  onClose={() => setMode('voice')} 
                />
              </div>
            </motion.div>
          )}

          {mode === 'disc_settings' && (
            <motion.div 
              key="disc_settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-zinc-900/[0.05] backdrop-blur-[2px]"
              onClick={() => setMode('voice')}
            >
              <div onClick={e => e.stopPropagation()}>
                <DISCSettingsOverlay 
                  profile={discProfile} 
                  onChange={handleDISCChange} 
                  onClose={() => setMode('voice')} 
                />
              </div>
            </motion.div>
          )}

          {mode === 'intent_settings' && (
            <motion.div 
              key="intent_settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-zinc-900/[0.05] backdrop-blur-[2px]"
              onClick={() => setMode('voice')}
            >
              <div onClick={e => e.stopPropagation()}>
                <IntentSettingsOverlay 
                  agentIntent={agentIntent}
                  userIntent={userIntent}
                  desiredOutcome={desiredOutcome}
                  agentName={agentName}
                  agentCompany={agentCompany}
                  agentRole={agentRole}
                  onAgentIntentChange={setAgentIntent}
                  onUserIntentChange={setUserIntent}
                  onDesiredOutcomeChange={setDesiredOutcome}
                  onAgentNameChange={setAgentName}
                  onAgentCompanyChange={setAgentCompany}
                  onAgentRoleChange={setAgentRole}
                  onClose={() => setMode('voice')} 
                />
              </div>
            </motion.div>
          )}

          {mode === 'api_health' && (
            <motion.div 
              key="api_health"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-zinc-900/[0.05] backdrop-blur-[2px]"
              onClick={() => setMode('voice')}
            >
              <div onClick={e => e.stopPropagation()}>
                <ApiHealthOverlay onClose={() => setMode('voice')} />
              </div>
            </motion.div>
          )}

          {govCanvas && (
            <motion.div
              key={`gov-${govCanvas.view}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-start sm:items-center justify-center bg-zinc-900/[0.05] backdrop-blur-[2px] overflow-y-auto pt-[calc(var(--shell-header-height)+0.75rem)] pb-[var(--shell-footer-height)] z-[var(--z-shell-governance-canvas)] min-h-0"
              onClick={dismissBackdrop}
            >
              <div onClick={(e) => e.stopPropagation()} className="w-full flex justify-center px-2">
                {govCanvas.view === 'governance_hub' && (
                  <GovernanceHubSurface
                    actorLabel={
                      payload?.view === 'governance_hub' ? payload.actorLabel : 'Founder'
                    }
                    dataPhase={dataPhase}
                    onClose={closeCanvas}
                    onSelectMode={(view) =>
                      void loadData(
                        view,
                        view === 'action_plan_review'
                          ? { actionPlanSource: 'AMD-2026-a10b9a' }
                          : undefined
                      )
                    }
                  />
                )}
                {govCanvas.view === 'workspace_onboarding' &&
                  payload?.view === 'workspace_onboarding' && (
                    <WorkspaceOnboardingSurface
                      workspaceState={payload.workspaceState}
                      connecting={workspaceConnecting}
                      onConnect={async () => {
                        setWorkspaceConnecting(true);
                        try {
                          setWorkspaceUserConnected(true);
                          await loadData('workspace_hub', undefined, { transitionMode: 'ui' });
                        } finally {
                          setWorkspaceConnecting(false);
                        }
                      }}
                      onContinueWithout={closeCanvas}
                      onClose={closeCanvas}
                    />
                  )}
                {govCanvas.view === 'workspace_hub' && payload?.view === 'workspace_hub' && (
                  <WorkspaceHubSurface
                    connected={payload.workspaceState === 'connected'}
                    mode="hub"
                    dataPhase={dataPhase}
                    onClose={closeCanvas}
                    onOpenCalendar={() => void loadData('workspace_calendar_hub')}
                    onOpenMail={() => void loadData('workspace_mail_hub')}
                  />
                )}
                {govCanvas.view === 'workspace_calendar_hub' && payload?.view === 'workspace_calendar_hub' && (
                  <WorkspaceHubSurface
                    connected
                    mode="calendar"
                    dataPhase={dataPhase}
                    dataError={dataError}
                    calendarRead={payload.calendarRead}
                    onClose={closeCanvas}
                    onBackToHub={() => void loadData('workspace_hub')}
                  />
                )}
                {govCanvas.view === 'workspace_mail_hub' && payload?.view === 'workspace_mail_hub' && (
                  <WorkspaceHubSurface
                    connected
                    mode="mail"
                    dataPhase={dataPhase}
                    dataError={dataError}
                    mailSearch={payload.mailSearch}
                    mailRead={payload.mailRead}
                    onClose={closeCanvas}
                    onBackToHub={() => void loadData('workspace_hub')}
                    onReadMail={(messageId) => void loadData('workspace_mail_hub', { mailMessageId: messageId })}
                    onClearMailRead={() => void loadData('workspace_mail_hub')}
                  />
                )}
                {govCanvas.view === 'review_docs' && (
                  <ReviewDocsSurface
                    pinned={payload?.view === 'review_docs' ? payload.pinned : []}
                    registryCount={payload?.view === 'review_docs' ? payload.registryCount : 0}
                    dataPhase={dataPhase}
                    dataError={dataError}
                    onRetry={() => void retryLoadData()}
                    onBack={goBack}
                    onOpenRegistry={() =>
                      void loadData('document_list', {
                        returnAfterList: 'review_docs',
                        listMode: 'review',
                      })
                    }
                    onOpenDocument={(documentId) =>
                      void loadData('document_view', { documentId })
                    }
                  />
                )}
                {govCanvas.view === 'discuss_documents' && (
                  <DiscussDocumentsSurface dataPhase={dataPhase} onBack={goBack} />
                )}
                {govCanvas.view === 'planning_assistant' && (
                  <PlanningAssistantSurface
                    documents={payload?.view === 'planning_assistant' ? payload.documents : []}
                    recommendedNextSteps={
                      payload?.view === 'planning_assistant' ? payload.recommendedNextSteps : []
                    }
                    progressSummary={
                      payload?.view === 'planning_assistant'
                        ? payload.progressSummary
                        : ''
                    }
                    dataPhase={dataPhase}
                    dataError={dataError}
                    onRetry={() => void retryLoadData()}
                    onBack={goBack}
                    onOpenDocument={(documentId) =>
                      void loadData('document_view', { documentId })
                    }
                    onOpenRegistry={() =>
                      void loadData('document_list', {
                        returnAfterList: 'planning_assistant',
                        listMode: 'full',
                      })
                    }
                    onOpenLifecycle={() => void loadData('lifecycle_status')}
                  />
                )}
                {govCanvas.view === 'research_assistant' && (
                  <ResearchAssistantSurface
                    library={payload?.view === 'research_assistant' ? payload.library : []}
                    registryCount={
                      payload?.view === 'research_assistant' ? payload.registryCount : 0
                    }
                    dataPhase={dataPhase}
                    dataError={dataError}
                    onRetry={() => void retryLoadData()}
                    onBack={goBack}
                    onOpenDocument={(documentId) =>
                      void loadData('document_view', { documentId })
                    }
                    onOpenFullLibrary={() =>
                      void loadData('document_list', {
                        returnAfterList: 'research_assistant',
                        listMode: 'full',
                      })
                    }
                  />
                )}
                {govCanvas.view === 'amendment_hub' && (
                  <AmendmentHubSurface
                    hub={payload?.view === 'amendment_hub' ? payload : null}
                    dataPhase={dataPhase}
                    dataError={dataError}
                    onRetry={() => void retryLoadData()}
                    onBack={goBack}
                    onOpenWorkflow={(runId, mode) =>
                      void loadData('amendment_workflow', {
                        workflowRunId: runId,
                        amendmentWorkflowMode: mode,
                      })
                    }
                  />
                )}
                {govCanvas.view === 'amendment_workflow' && (
                  <AmendmentWorkflowSurface
                    run={payload?.view === 'amendment_workflow' ? payload.run : null}
                    workflowMode={
                      payload?.view === 'amendment_workflow' ? payload.mode : 'edit'
                    }
                    dataPhase={dataPhase}
                    dataError={dataError}
                    onBack={goBack}
                    onRunUpdated={applyAmendmentWorkflowRun}
                  />
                )}
                {govCanvas.view === 'action_plan_review' && (
                  <ActionPlanReviewSurface
                    sourceName={
                      govCanvas.actionPlanSource ??
                      (payload?.view === 'action_plan_review' ? payload.sourceName : 'AMD-2026-a10b9a')
                    }
                    bundle={payload?.view === 'action_plan_review' ? payload.bundle : null}
                    dataPhase={dataPhase}
                    dataError={dataError}
                    onBack={goBack}
                    onRefresh={() => void retryLoadData()}
                  />
                )}
                {govCanvas.view === 'document_list' && (
                  <GovernanceDocumentListSurface
                    documents={payload?.view === 'document_list' ? payload.documents : []}
                    dataPhase={dataPhase}
                    dataError={dataError}
                    onRetry={() => void retryLoadData()}
                    onClose={goBack}
                    onNavigate={(view, meta) =>
                      void loadData(view, { documentId: meta?.documentId })
                    }
                  />
                )}
                {govCanvas.view === 'document_view' && govCanvas.documentId && (
                  <DocumentViewerOverlay
                    documentId={govCanvas.documentId}
                    doc={
                      payload?.view === 'document_view' &&
                      payload.documentId === govCanvas.documentId
                        ? payload.document
                        : null
                    }
                    dataPhase={dataPhase}
                    dataError={dataError}
                    onRetry={() => void retryLoadData()}
                    onClose={goBack}
                    onReadAloud={(t) => {
                      void speakText(t.slice(0, 800));
                    }}
                  />
                )}
                {govCanvas.view === 'conflict_results' && (
                  <ConflictScanOverlay
                    scan={payload?.view === 'conflict_results' ? payload.scan : null}
                    dataPhase={dataPhase}
                    dataError={dataError}
                    onRetry={() => void retryLoadData()}
                    onClose={goBack}
                  />
                )}
                {govCanvas.view === 'compliance_check' && (
                  <ComplianceCheckOverlay
                    primitiveNames={
                      payload?.view === 'compliance_check'
                        ? payload.primitiveNames
                        : ['NodeContract', 'PolicyRecord']
                    }
                    dataPhase={dataPhase}
                    dataError={dataError}
                    onRetry={() => void retryLoadData()}
                    onClose={goBack}
                  />
                )}
                {govCanvas.view === 'lifecycle_status' && (
                  <LifecyclePanelOverlay
                    documents={payload?.view === 'lifecycle_status' ? payload.documents : []}
                    selectedId={payload?.view === 'lifecycle_status' ? payload.selectedId : ''}
                    versions={payload?.view === 'lifecycle_status' ? payload.versions : []}
                    dataPhase={dataPhase}
                    dataError={dataError}
                    lifecycleBusy={lifecycleBusy}
                    onRetry={() => void retryLoadData()}
                    onSelectDocumentId={(id) => void refreshLifecycleSelection(id)}
                    onClose={goBack}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <CommandRail
        rail={commandRail}
        mode={mode === 'chat' ? 'chat' : 'voice'}
        menuOpen={mode === 'menu'}
        chatInput={chatInput}
        onChatInputChange={setChatInput}
        onChatSubmit={handleChatSubmit}
        onToggleVoiceChat={() => setMode(mode === 'chat' ? 'voice' : 'chat')}
        onMenuClick={() => setMode(mode === 'menu' ? 'voice' : 'menu')}
        isPTTActive={isPTTActive}
        onPTTDown={(e) => void handlePTTDown(e)}
        onPTTUp={(e) => void handlePTTUp(e)}
        displayStatus={statusDisplay}
        statusTone={statusTone}
      />

      {/* Powered By Branding */}
      <div className="fixed bottom-[calc(var(--shell-footer-height)+0.5rem)] left-6 md:left-12 opacity-40 flex items-center gap-2 pointer-events-none z-[var(--z-shell-chrome)]">
        <span className="text-[8px] uppercase tracking-widest font-bold text-zinc-400">Powered by</span>
        <div className="flex items-center gap-1">
          <span className="font-black text-xs text-zinc-900">CLEAR</span>
          <span className="text-emerald-500 font-black text-xs">VOICE</span>
          <div className="bg-zinc-900 text-white text-[8px] px-1 rounded">AI</div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const speakTextRef = useRef<(text: string, overrideVoice?: string) => Promise<void>>(async () => {});
  return (
    <GovernanceCanvasProvider
      onPolicyDenied={(payload) =>
        void speakTextRef.current(payload.spokenMessage ?? payload.reason)
      }
    >
      <AppImpl speakTextRef={speakTextRef} />
    </GovernanceCanvasProvider>
  );
}
