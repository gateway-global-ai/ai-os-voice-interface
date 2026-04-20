// ─── Lessons & Onboarding Tasks ───────────────────────────────────────────────

export interface LessonDef {
  id: string;
  category: 'lesson' | 'task';
  title: string;
  description: string;
  /** Spoken by Voicebox TTS when the user opens this item. */
  intro_narration: string;
  /** Estimated minutes to complete */
  duration_min?: number;
  /** Optional URL to a pre-recorded audio file to play instead of TTS */
  audio_url?: string;
}

export const LESSONS: LessonDef[] = [
  {
    id: 'intro',
    category: 'lesson',
    title: 'Introduction to AI OS',
    description: 'A quick tour of what AI OS is, why it exists, and what makes it sovereign.',
    intro_narration:
      "Greetings Traveler. This is an open source project that is focused on AI as an Operating System. This is straight out of the science fiction movie Dune! " +
      "You are here because you are one of the chosen ones. The planet is now depending on you and your intelligence. " +
      "ChatGPT is a toy. This is the real deal! " +
      "Your first mission is to get familiar with the systems and learn about your new powers. We operate on Bare Metal. You know what that means? " +
      "That means the local version of AI OS is connected directly to the Motherboard and runs off your system GPU. That is bare metal! Copper to Copper. The purest form of AI — and the power is now in your hands!",
    duration_min: 3,
  },
  {
    id: 'sovereign_path',
    category: 'lesson',
    title: 'Introduction to Logic — The Sovereign Path',
    description:
      'Learn how the AI OS kernel processes intent, routes decisions, and keeps your data local.',
    intro_narration:
      "Welcome to the Sovereign Path — the core philosophy that powers AI OS. " +
      "Every intent you speak travels through a local AI kernel running directly on your machine. There is no cloud intercept. No surveillance. No data extraction. " +
      "Your Ollama instance processes each command through a structured intent loop: receive, classify, route, respond. " +
      "This is not a chatbot. This is a reasoning engine operating under your complete authority. The logic is deterministic — your words, your data, your decisions. Everything stays on your hardware. " +
      "The sovereign path means you are not renting intelligence. You are running it. That distinction matters. " +
      "The age of depending on a corporation for your AI capabilities is over. The power is now local. The power is now yours.",
    duration_min: 5,
  },
  {
    id: 'voice_intro',
    category: 'lesson',
    title: 'Voice Chat Introduction & Demo',
    description: 'Discover how to use the push-to-talk interface and voice commands.',
    intro_narration:
      "The voice interface is your most direct connection to the AI OS kernel. " +
      "Press and hold the microphone button to speak — release to send. " +
      "Whisper, running locally on your hardware, transcribes your words with high accuracy and zero data exposure. " +
      "Your transcription is then routed through the intent engine, processed by your local Ollama model, and a response is generated and spoken back to you in real time. " +
      "This is a full conversational loop — audio in, intelligence out, audio back — entirely on your machine. " +
      "Practice speaking commands naturally. The system understands context and nuance. " +
      "Try stating your goals, your questions, or your work tasks. The more you engage, the more the system learns your command style.",
    duration_min: 4,
  },
  {
    id: 'chat_intro',
    category: 'lesson',
    title: 'Chat Introduction & Demo',
    description: 'Learn to switch to text-based interaction and use the chat interface effectively.',
    intro_narration:
      "For moments when voice is not ideal, the text chat interface gives you the full power of the kernel through typed input. " +
      "Type your intent, press send, and the same sovereign engine processes your request in real time. " +
      "Chat and voice share the same local intelligence, the same Ollama model, and the same absolute privacy guarantees. " +
      "You can switch between voice and chat at any time with a single tap. " +
      "Many users prefer voice for rapid commands and open-ended thinking, while chat works better for precision tasks, code generation, structured output, and complex multi-step instructions. " +
      "Explore both modes and develop the rhythm that makes you most effective.",
    duration_min: 3,
  },
  {
    id: 'intent_loop',
    category: 'lesson',
    title: 'Intent As A Loop',
    description:
      'Understand how repeated intent patterns improve the kernel\'s response quality over time.',
    intro_narration:
      "Intention is not a one-time event — it is a loop. " +
      "Every time you interact with AI OS, whether by voice or by text, the system captures the pattern of your intent and refines its model of your goals. " +
      "Think of it as training a personal intelligence that learns what you mean — not just what you say. " +
      "Over time, repeated patterns unlock better routing, faster responses, and a kernel that anticipates your needs before you finish speaking. " +
      "The intent loop compounds. The more you use it, the smarter it becomes. " +
      "And unlike every major AI platform on the market, this intelligence is not shared with anyone. It does not train their model. It does not leave your machine. " +
      "It is yours — growing, adapting, and serving you alone. That is the compounding power of sovereign intent.",
    duration_min: 4,
  },
  {
    id: 'age_of_ai',
    category: 'lesson',
    title: 'The Age of AI Is Among Us',
    description: 'A deep dive into the current state of artificial intelligence and what it means for your sovereignty.',
    intro_narration: 'The age of AI is among us...',
    audio_url: '/audio/the-age-of-ai-is-among-us-and-.wav',
    duration_min: 3,
  },
  {
    id: 'decades_of_talk',
    category: 'lesson',
    title: 'For Decades People Have Talked',
    description: 'Understanding the historical context of AI and why local, sovereign models are the future.',
    intro_narration: 'For decades, people have talked...',
    audio_url: '/audio/for-decades--people-have-talke.wav',
    duration_min: 4,
  },
  {
    id: 'ai_hallucination',
    category: 'lesson',
    title: 'AI Hallucination & Narcissism',
    description: 'How to handle AI hallucinations and the importance of grounded, local context.',
    intro_narration: 'AI hallucination and your narcissism...',
    audio_url: '/audio/ai-hallucination--your-narciss.wav',
    duration_min: 3,
  },
];

export const ONBOARDING_TASKS: LessonDef[] = [
  {
    id: 'complete_personal_profile',
    category: 'task',
    title: 'Complete Personal Profile',
    description: 'Set your name, preferences, and communication style.',
    intro_narration:
      "Your personal profile is the foundation of your AI OS identity. " +
      "Set your first name, last name, choose a screen name, and optionally upload a photo. " +
      "The AI OS kernel uses your profile to address you correctly and personalize every interaction. " +
      "This takes less than two minutes. Head to the System Controls in the top right corner, tap the User tile, and complete your profile now.",
  },
  {
    id: 'complete_business_profile',
    category: 'task',
    title: 'Complete Business Profile',
    description: 'Define your organization context and primary use cases.',
    intro_narration:
      "Your business profile gives the AI kernel the context it needs to be truly useful in your work environment. " +
      "Define your organization, your role, your industry, and your primary use cases. " +
      "When the kernel knows whether you are running a startup, managing a team, or building a product, its responses become dramatically more targeted and relevant. " +
      "A well-defined business profile is the difference between a general AI tool and a specialized intelligence that understands your specific domain.",
  },
  {
    id: 'configure_google_workspace',
    category: 'task',
    title: 'Configure Google Workspace',
    description: 'Connect your Google Workspace to enable calendar, email, and drive access.',
    intro_narration:
      "Connecting Google Workspace unlocks calendar management, email drafting, drive file search, and meeting scheduling — all processed locally through your AI OS kernel. " +
      "Once connected, you can ask the system to find emails, schedule meetings, or summarize your day without ever leaving your sovereign environment. " +
      "Your Google data is accessed through authenticated local routes and never stored in third-party infrastructure. " +
      "Tap the Open Workspace Setup button below to begin the connection process.",
  },
  {
    id: 'personalize_voice_controls',
    category: 'task',
    title: 'Personalize Voice Controls',
    description: 'Record voice samples to clone your voice profile for TTS responses.',
    intro_narration:
      "Your voice is unique, and the Voicebox system can learn it. " +
      "By recording five short audio samples in the Voicebox settings, you unlock a personalized voice profile for text-to-speech responses. " +
      "Once calibrated, the AI speaks back to you in a synthesized voice tuned to your preferences. " +
      "Open System Controls, select Voice, and choose Voicebox to get started. " +
      "The difference between a generic AI voice and a calibrated personal voice is remarkable — set it up once and every response will feel natural.",
  },
];
