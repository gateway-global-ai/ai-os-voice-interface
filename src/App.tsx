/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent, type MutableRefObject } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Eye, 
  Mic, 
  Menu as MenuIcon, 
  Home, 
  Send,
  User,
  LogIn,
  UserPlus,
  Settings,
  Circle,
  Grid,
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
import { ApiHealthOverlay } from './overlays/ApiHealthOverlay';
import { stripIntentLineForDisplay } from './governance/intentParse';
import { GovernanceCanvasProvider, useGovernanceCanvas } from './governance/GovernanceCanvasContext';

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
  | "apps"
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

const WorkspaceAppsOverlay = ({ onClose }: { onClose: () => void }) => {
  const apps = [
    { 
      name: 'Gmail', 
      color: '#EA4335',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8">
          <path fill="#EA4335" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
        </svg>
      )
    },
    { 
      name: 'Drive', 
      color: '#34A853',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8">
          <path fill="#FBBC04" d="M9.25 5.25l-4.5 7.75h9l-4.5-7.75z"/>
          <path fill="#34A853" d="M14.75 13l-4.5 7.75h9l-4.5-7.75z"/>
          <path fill="#4285F4" d="M18.5 5.25l-4.5 7.75h9l-4.5-7.75z"/>
        </svg>
      )
    },
    { 
      name: 'Docs', 
      color: '#4285F4',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8">
          <path fill="#4285F4" d="M16 2H8C6.9 2 6 2.9 6 4v16c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 14H9v-2h6v2zm0-4H9v-2h6v2zm0-4H9V6h6v2z"/>
        </svg>
      )
    },
    { 
      name: 'Sheets', 
      color: '#0F9D58',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8">
          <path fill="#0F9D58" d="M16 2H8C6.9 2 6 2.9 6 4v16c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 14H9v-2h6v2zm0-4H9v-2h6v2zm0-4H9V6h6v2z"/>
          <path fill="white" opacity="0.3" d="M7 7h10v10H7z"/>
        </svg>
      )
    },
    { 
      name: 'Slides', 
      color: '#F4B400',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8">
          <path fill="#F4B400" d="M16 2H8C6.9 2 6 2.9 6 4v16c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 14H9v-2h6v2zm0-4H9v-2h6v2zm0-4H9V6h6v2z"/>
          <circle fill="white" opacity="0.3" cx="12" cy="12" r="3"/>
        </svg>
      )
    },
    { 
      name: 'Calendar', 
      color: '#4285F4',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8">
          <path fill="#4285F4" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
          <text x="12" y="17" fill="#4285F4" fontSize="8" fontWeight="bold" textAnchor="middle">31</text>
        </svg>
      )
    },
    { 
      name: 'Meet', 
      color: '#00AC47',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8">
          <path fill="#00AC47" d="M15 8v8H5V8h10m1-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-3.5l4 4v-11l-4 4V8c0-1.1-.9-2-2-2z"/>
        </svg>
      )
    },
    { 
      name: 'Keep', 
      color: '#FBBC04',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8">
          <path fill="#FBBC04" d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/>
        </svg>
      )
    },
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
          <Grid className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Google Workspace</h2>
        <p className="text-zinc-500 mt-2">Intent recognized: Opening productivity suite</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-8">
        {apps.map((app) => (
          <button 
            key={app.name}
            onClick={onClose}
            className="flex flex-col items-center gap-3 group transition-all"
          >
            <div 
              className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center shadow-[0_8px_16px_-4px_rgba(0,0,0,0.05)] border border-zinc-100 group-hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.1)] group-hover:-translate-y-1 transition-all duration-300"
            >
              <div className="transform group-hover:scale-110 transition-transform duration-300">
                {app.icon}
              </div>
            </div>
            <span className="text-xs font-bold text-zinc-500 group-hover:text-zinc-900 transition-colors">{app.name}</span>
          </button>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-zinc-100 flex justify-center">
        <button 
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-900 text-sm font-bold uppercase tracking-widest transition-colors"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
};

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
  onToggleApps,
  onOpenGovernance,
  currentMode,
  governanceCanvasOpen,
}: { 
  onOpenVoiceSettings: () => void; 
  onOpenDISCSettings: () => void;
  onOpenIntentSettings: () => void;
  onOpenApiHealth: () => void;
  onToggleVisual: () => void;
  onToggleApps: () => void;
  onOpenGovernance: () => void;
  currentMode: string;
  governanceCanvasOpen: boolean;
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
          onClick={onToggleApps}
          className={`p-4 rounded-2xl border transition-all cursor-pointer group ${currentMode === 'apps' ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100'}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Grid className={`w-4 h-4 ${currentMode === 'apps' ? 'text-emerald-600' : 'text-zinc-400 group-hover:text-emerald-600'}`} />
            <h3 className={`text-sm font-semibold transition-colors ${currentMode === 'apps' ? 'text-emerald-600' : 'text-zinc-900'}`}>Apps</h3>
          </div>
          <p className="text-[10px] text-zinc-500 leading-tight">Open productivity suite</p>
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  
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

  const handlePTTDown = async (e: React.PointerEvent<HTMLButtonElement>) => {
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

          If the user wants to change your voice, say exactly: 'OK, let me display the voice options for you.'
          If the user wants to adjust your DISC profile, say exactly: 'OK, let me display the DISC profile settings for you.'
          If the user wants to change or adjust intents, outcomes, or your identity (name, company, role), say exactly: 'OK, let me display the system configuration for you.'

          GOVERNANCE CANVAS (structured intent): After your spoken reply, add exactly one final line with no markdown fence:
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

      // Intent Recognition: Change Voice
      if (agentText.includes("display the voice options")) {
        setTimeout(() => setMode('voice_settings'), 1000);
      }

      // Intent Recognition: DISC Profile
      if (agentText.includes("display the DISC profile settings")) {
        setTimeout(() => setMode('disc_settings'), 1000);
      }

      // Intent Recognition: Intent Settings
      if (agentText.includes("display the system configuration")) {
        setTimeout(() => setMode('intent_settings'), 1000);
      }

      setTimeout(() => applyAgentIntent(agentText), 1000);

    } catch (err) {
      console.error('Gemini API error:', err);
      setStatus("error");
      setTimeout(() => setStatus("connected"), 3000);
    }
  };

  const handlePTTUp = async (e: React.PointerEvent<HTMLButtonElement>) => {
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

          If the user wants to change your voice, say exactly: 'OK, let me display the voice options for you.'
          If the user wants to adjust your DISC profile, say exactly: 'OK, let me display the DISC profile settings for you.'
          If the user wants to change or adjust intents, outcomes, or your identity (name, company, role), say exactly: 'OK, let me display the system configuration for you.'

          GOVERNANCE CANVAS (structured intent): After your spoken reply, add exactly one final line with no markdown fence:
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

      if (agentText.includes("display the voice options")) {
        setTimeout(() => setMode('voice_settings'), 1000);
      }
      if (agentText.includes("display the DISC profile settings")) {
        setTimeout(() => setMode('disc_settings'), 1000);
      }
      if (agentText.includes("display the system configuration")) {
        setTimeout(() => setMode('intent_settings'), 1000);
      }

      setTimeout(() => applyAgentIntent(agentText), 1000);
      
    } catch (err) {
      console.error('Gemini API error:', err);
      setStatus("error");
      setTimeout(() => setStatus("connected"), 3000);
    }
  };

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

      {/* User Profile Overlay (Top Right) */}
      <div className="absolute top-6 right-6 z-50">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-3 pr-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-zinc-200 shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
            J
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Mode:</span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">Admin</span>
            </div>
            <span className="text-sm font-bold text-zinc-900">Jason</span>
          </div>
        </motion.div>
      </div>

      {/* Agent Identity Overlay (Bottom Right) */}
      <div className="absolute bottom-32 right-6 z-50">
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/80 backdrop-blur-xl border border-zinc-200 shadow-sm"
        >
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <motion.div 
              className="absolute inset-0 rounded-full bg-emerald-500"
              animate={{ scale: [1, 2.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <span className="text-xs font-bold text-zinc-500 tracking-wide">AI OS Agent</span>
        </motion.div>
      </div>
      
      {/* Main Content Area */}
      <main className="relative h-full flex flex-col items-center justify-center pb-32">
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
              <div className="flex-1 overflow-y-auto p-6 space-y-6 pt-12">
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

              <div className="p-6 bg-white/80 border-t border-zinc-200">
                <form onSubmit={handleChatSubmit} className="flex gap-3 max-w-4xl mx-auto">
                  <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-zinc-100 border border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500 transition-colors text-zinc-900"
                  />
                  <button 
                    type="submit"
                    className="p-4 bg-emerald-500 rounded-2xl hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    <Send className="w-6 h-6 text-white" />
                  </button>
                </form>
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
                  onToggleApps={() => setMode(mode === 'apps' ? 'voice' : 'apps')}
                  onOpenGovernance={() => {
                    setMode('voice');
                    void loadData('governance_hub');
                  }}
                  currentMode={mode}
                  governanceCanvasOpen={govCanvas !== null}
                />
              </div>
            </motion.div>
          )}

          {mode === 'apps' && (
            <motion.div 
              key="apps"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-zinc-900/[0.05] backdrop-blur-[2px]"
              onClick={() => setMode('voice')}
            >
              <div onClick={e => e.stopPropagation()}>
                <WorkspaceAppsOverlay onClose={() => setMode('voice')} />
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
              className="absolute inset-0 flex items-start sm:items-center justify-center bg-zinc-900/[0.05] backdrop-blur-[2px] overflow-y-auto pt-8 pb-32 z-[60] min-h-0"
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
                {govCanvas.view === 'workspace_hub' && (
                  <WorkspaceHubSurface
                    mode="hub"
                    dataPhase={dataPhase}
                    onClose={closeCanvas}
                    onOpenCalendar={() => void loadData('workspace_calendar_hub')}
                  />
                )}
                {govCanvas.view === 'workspace_calendar_hub' && (
                  <WorkspaceHubSurface
                    mode="calendar"
                    dataPhase={dataPhase}
                    dataError={dataError}
                    calendarRead={
                      payload?.view === 'workspace_calendar_hub' ? payload.calendarRead : undefined
                    }
                    onClose={closeCanvas}
                    onBackToHub={() => void loadData('workspace_hub')}
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

      {/* Footer Interface */}
      <footer className="fixed bottom-0 left-0 right-0 h-24 bg-white/90 backdrop-blur-xl border-t border-zinc-200 px-6 md:px-12 flex items-center justify-between z-50">
        <div className="flex items-center gap-4 md:gap-8">
          {mode === 'chat' ? (
            <button 
              onClick={() => setMode('voice')}
              className="flex flex-col items-center gap-1 text-zinc-400 hover:text-emerald-600 transition-colors"
            >
              <Home className="w-6 h-6" />
              <span className="text-[10px] uppercase tracking-widest font-bold">Home</span>
            </button>
          ) : (
            <button 
              onClick={() => setMode('chat')}
              className={`flex flex-col items-center gap-1 transition-colors ${mode === 'chat' ? 'text-emerald-600' : 'text-zinc-400 hover:text-zinc-900'}`}
            >
              <MessageSquare className="w-6 h-6" />
              <span className="text-[10px] uppercase tracking-widest font-bold">Chat</span>
            </button>
          )}
        </div>

        {/* PTT Button — pointer capture ensures release/end even if pointer leaves the button */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-8">
          <button 
            type="button"
            onPointerDown={(e) => void handlePTTDown(e)}
            onPointerUp={(e) => void handlePTTUp(e)}
            onPointerCancel={(e) => void handlePTTUp(e)}
            className={`
              w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-300
              ${isPTTActive 
                ? 'bg-emerald-400 scale-90 shadow-[0_0_40px_rgba(52,211,153,0.4)]' 
                : 'bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.2)]'}
            `}
          >
            <Mic className={`w-8 h-8 md:w-10 md:h-10 text-white ${isPTTActive ? 'animate-pulse' : ''}`} />
          </button>
          <div className="mt-10 text-center">
            <span className="text-[10px] uppercase tracking-[0.2em] font-black text-zinc-400">Push to Talk</span>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <button 
            onClick={() => setMode(mode === 'menu' ? 'voice' : 'menu')}
            className={`flex flex-col items-center gap-1 transition-colors ${mode === 'menu' ? 'text-emerald-600' : 'text-zinc-400 hover:text-zinc-900'}`}
          >
            <MenuIcon className="w-6 h-6" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Menu</span>
          </button>

          {/* System Status */}
          <div className="hidden sm:flex items-center gap-3 pl-4 md:pl-8 border-l border-zinc-200">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest font-black text-zinc-300">Status</span>
              <span className={`text-[10px] uppercase tracking-widest font-bold ${
                status === 'error' ? 'text-red-500' : 
                status === 'offline' ? 'text-zinc-400' : 
                'text-emerald-600'
              }`}>
                {status}
              </span>
            </div>
            <motion.div 
              animate={status === 'connected' ? { opacity: [0.4, 1, 0.4] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Circle className={`w-2 h-2 fill-current ${
                status === 'error' ? 'text-red-500' : 
                status === 'offline' ? 'text-zinc-400' : 
                'text-emerald-600'
              }`} />
            </motion.div>
          </div>
        </div>
      </footer>

      {/* Powered By Branding */}
      <div className="fixed bottom-28 left-6 md:left-12 opacity-40 flex items-center gap-2 pointer-events-none">
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
