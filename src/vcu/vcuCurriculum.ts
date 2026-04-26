/**
 * Source-backed Vibe Coding University curriculum manifests.
 * These rows are not mock lessons: they are seeded as review-stage records and
 * remain unpublished until real install/test/triangulation evidence is attached.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type VcuCourseLevel = 'foundation' | 'intermediate' | 'advanced' | 'final_project';
export type VcuPublishStatus = 'draft' | 'review' | 'published' | 'blocked' | 'unverified';
export type VcuVerificationStatus = 'verified' | 'review_pending' | 'blocked' | 'unverified';

export interface VcuCourseManifest {
  course_id: string;
  title: string;
  description: string;
  level: VcuCourseLevel;
  sort_order: number;
  status: VcuPublishStatus;
  final_project: boolean;
  docs_url?: string;
}

export interface VcuLessonManifest {
  lesson_id: string;
  course_id: string;
  title: string;
  summary: string;
  docs_url: string;
  docs_urls: string[];
  learning_outcomes: string[];
  prerequisites: string[];
  install_steps: Array<{ command: string; expected: string; evidence_required: string }>;
  test_steps: Array<{ command: string; expected: string; evidence_required: string }>;
  example_project: {
    name: string;
    objective: string;
    acceptance: string[];
  };
  aptitude_test: {
    pass_threshold: number;
    questions: Array<{ prompt: string; answer: string }>;
  };
  multimodal_assets: {
    gemini_voice_prompt: string;
    video_outline: string[];
    visual_aids: string[];
  };
  cursor_rule_path: string;
  cursor_skill_path: string;
  agent_prompt_path: string;
  verification_status: VcuVerificationStatus;
  install_verified: boolean;
  test_verified: boolean;
  triangulation_status: 'not_started' | 'round_1' | 'revision' | 'round_2' | 'passed' | 'blocked';
  no_mock_verified: boolean;
  publish_status: VcuPublishStatus;
  sort_order: number;
}

export interface VcuAgentSkillManifest {
  agent_skill_id: string;
  name: string;
  description: string;
  trigger_terms: string[];
  docs_urls: string[];
  cursor_rule_paths: string[];
  cursor_skill_path: string;
  agent_prompt_path: string;
  tool_ids: string[];
  resource_refs: Array<{ type: string; uri: string }>;
  verification_status: VcuVerificationStatus;
  no_mock_verified: boolean;
  enabled: boolean;
}

export interface McpSdkRegistryManifest {
  registry_id: string;
  source_name: string;
  source_url: string;
  sdk_language: string | null;
  protocol_version: string | null;
  capability_type: 'tool' | 'resource' | 'prompt' | 'client' | 'server' | 'app' | 'schema' | 'bridge' | 'ui';
  capability_name: string;
  schema_ref: string | null;
  docs_summary: string;
  verification_status: VcuVerificationStatus;
}

export interface VcuRequiredSource {
  label: string;
  url: string;
}

export type VcuBehaviorArtifactType =
  | 'cursor_rule'
  | 'cursor_skill'
  | 'agent_prompt'
  | 'docs_registry'
  | 'schema'
  | 'seed_importer';

export interface VcuBehaviorArtifactManifest {
  artifact_id: string;
  artifact_type: VcuBehaviorArtifactType;
  title: string;
  uri: string;
  description: string;
  docs_urls: string[];
  lesson_bindings: string[];
  verification_status: VcuVerificationStatus;
  no_mock_status: VcuVerificationStatus;
  reviewer_notes: string;
  usage_constraints: {
    stores_private_prompt_contents: false;
    link_check_status: 'unverified' | 'blocked' | 'verified';
    evidence_required: string;
  };
}

const noMockReviewStatus = {
  verification_status: 'review_pending' as const,
  install_verified: false,
  test_verified: false,
  triangulation_status: 'not_started' as const,
  no_mock_verified: false,
  publish_status: 'review' as const,
};

function lesson(
  sort_order: number,
  input: Omit<VcuLessonManifest, keyof typeof noMockReviewStatus | 'sort_order' | 'cursor_rule_path' | 'cursor_skill_path' | 'agent_prompt_path'>,
): VcuLessonManifest {
  const id = input.lesson_id;
  return {
    ...input,
    ...noMockReviewStatus,
    sort_order,
    cursor_rule_path: `.cursor/rules/vcu/${id}.mdc`,
    cursor_skill_path: `.cursor/skills/vcu-${id}/SKILL.md`,
    agent_prompt_path: `docs/vcu/agents/${id}-agent.md`,
  };
}

export const REQUIRED_MCP_SOURCE_MANIFEST: VcuRequiredSource[] = [
  { label: 'Rust SDK', url: 'https://github.com/modelcontextprotocol/rust-sdk' },
  { label: 'TypeScript schema 2025-11-25', url: 'https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2025-11-25/schema.ts' },
  { label: 'Build MCP server', url: 'https://modelcontextprotocol.io/docs/develop/build-server' },
  { label: 'Build MCP client', url: 'https://modelcontextprotocol.io/docs/develop/build-client' },
  { label: 'MCP Apps', url: 'https://modelcontextprotocol.io/extensions/apps/overview' },
  { label: 'MCP UI', url: 'https://github.com/MCP-UI-Org/mcp-ui' },
  { label: 'App Bridge', url: 'https://apps.extensions.modelcontextprotocol.io/api/modules/app-bridge.html' },
  { label: 'Basic Server React', url: 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-react' },
  { label: 'Basic Server Svelte', url: 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-svelte' },
  { label: 'Transcript Server', url: 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/transcript-server' },
  { label: 'Video Resource Server', url: 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/video-resource-server' },
  { label: 'Say Server', url: 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/say-server' },
  { label: 'QR Server', url: 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/qr-server' },
  { label: 'Map Server', url: 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/map-server' },
];

const requiredMcpDocsUrls = REQUIRED_MCP_SOURCE_MANIFEST.map((source) => source.url);

export const VCU_COURSES: VcuCourseManifest[] = [
  {
    course_id: 'mcp-foundations',
    title: 'MCP Foundations',
    description: 'Protocol, schema, server, client, and Rust SDK foundations for building truthful MCP systems.',
    level: 'foundation',
    sort_order: 1,
    status: 'review',
    final_project: false,
    docs_url: 'https://modelcontextprotocol.io/docs/develop/build-server',
  },
  {
    course_id: 'mcp-apps-ui',
    title: 'MCP Apps And UI',
    description: 'Interactive MCP Apps, UI resources, App Bridge, React, and Svelte starter projects.',
    level: 'intermediate',
    sort_order: 2,
    status: 'review',
    final_project: false,
    docs_url: 'https://modelcontextprotocol.io/extensions/apps/overview',
  },
  {
    course_id: 'mcp-media-utilities',
    title: 'MCP Media And Utility Servers',
    description: 'Transcript, video resource, TTS, QR, and map servers for high-bandwidth AI OS communication.',
    level: 'advanced',
    sort_order: 3,
    status: 'review',
    final_project: false,
    docs_url: 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples',
  },
  {
    course_id: 'vcu-final-projects',
    title: 'VCU Final Projects',
    description: 'Capstone projects for a voice-driven video builder and a sellable MCP-powered app.',
    level: 'final_project',
    sort_order: 4,
    status: 'review',
    final_project: true,
    docs_url: 'https://modelcontextprotocol.io/extensions/apps/overview',
  },
];

export const VCU_LESSONS: VcuLessonManifest[] = [
  lesson(1, {
    lesson_id: 'mcp-rust-sdk',
    course_id: 'mcp-foundations',
    title: 'Rust MCP SDK And Capability Registry',
    summary: 'Use the official Rust SDK as the source for server handlers, tools, resources, prompts, and Rust coding-agent capabilities.',
    docs_url: 'https://github.com/modelcontextprotocol/rust-sdk',
    docs_urls: ['https://github.com/modelcontextprotocol/rust-sdk', 'https://modelcontextprotocol.io/docs/develop/build-server'],
    learning_outcomes: ['Explain what the Rust SDK provides', 'Identify tools, resources, and prompts in Rust MCP servers', 'Test a Rust MCP server with Inspector'],
    prerequisites: ['Rust toolchain', 'Node/npm for MCP Inspector'],
    install_steps: [{ command: 'cargo --version && npx --version', expected: 'Both commands print installed versions.', evidence_required: 'Actual command output and exit code.' }],
    test_steps: [{ command: 'cargo build --release', expected: 'Rust MCP server crate builds a release binary.', evidence_required: 'Build log and binary path.' }],
    example_project: { name: 'Rust Weather MCP Server', objective: 'Create a Rust MCP server and expose a verified tool.', acceptance: ['Release build succeeds', 'Inspector lists the tool', 'No stdout logging corrupts stdio JSON-RPC'] },
    aptitude_test: { pass_threshold: 80, questions: [{ prompt: 'Name the three MCP capability types a server can expose.', answer: 'Resources, tools, and prompts.' }] },
    multimodal_assets: { gemini_voice_prompt: 'Explain the Rust SDK as the coding-agent capability registry using tools, resources, and prompts.', video_outline: ['SDK overview', 'Cargo setup', 'Inspector test'], visual_aids: ['ServerHandler lifecycle diagram', 'Tool/resource/prompt table'] },
  }),
  lesson(2, {
    lesson_id: 'mcp-typescript-schema-2025-11-25',
    course_id: 'mcp-foundations',
    title: 'MCP TypeScript Schema 2025-11-25',
    summary: 'Study the canonical protocol schema for JSON-RPC, protocol versions, capabilities, tools, resources, tasks, and elicitation.',
    docs_url: 'https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2025-11-25/schema.ts',
    docs_urls: ['https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2025-11-25/schema.ts'],
    learning_outcomes: ['Read schema interfaces as protocol truth', 'Explain task augmentation and capability negotiation', 'Use schema references in lesson and task instructions'],
    prerequisites: ['TypeScript basics', 'JSON-RPC basics'],
    install_steps: [{ command: 'node --version', expected: 'Node version prints successfully.', evidence_required: 'Actual command output and exit code.' }],
    test_steps: [{ command: 'node -e "console.log(JSON.stringify({jsonrpc:\\"2.0\\",method:\\"initialize\\"}))"', expected: 'A JSON-RPC initialize-shaped object is printed.', evidence_required: 'Command output and exit code.' }],
    example_project: { name: 'Schema Contract Probe', objective: 'Map tool/resource/task schema fields to a small contract checklist.', acceptance: ['Protocol version cited', 'Tool input/output schema fields identified', 'Task support caveats recorded'] },
    aptitude_test: { pass_threshold: 80, questions: [{ prompt: 'What constant identifies the latest protocol version in the schema?', answer: 'LATEST_PROTOCOL_VERSION, currently 2025-11-25 in the cited schema.' }] },
    multimodal_assets: { gemini_voice_prompt: 'Teach the schema as the protocol contract that prevents agent hallucination.', video_outline: ['JSON-RPC envelope', 'Capabilities', 'Tasks and tools'], visual_aids: ['Schema entity map', 'Capability negotiation flow'] },
  }),
  lesson(3, {
    lesson_id: 'mcp-build-server',
    course_id: 'mcp-foundations',
    title: 'Build MCP Servers',
    summary: 'Build servers that expose tools, resources, and prompts, with safe stdio logging and reproducible tests.',
    docs_url: 'https://modelcontextprotocol.io/docs/develop/build-server',
    docs_urls: ['https://modelcontextprotocol.io/docs/develop/build-server'],
    learning_outcomes: ['Explain server capabilities', 'Build a tool-backed server', 'Avoid stdout logging in stdio servers'],
    prerequisites: ['Python, TypeScript, or Rust basics', 'Terminal command execution'],
    install_steps: [{ command: 'npx --version', expected: 'npx prints an installed version.', evidence_required: 'Actual command output and exit code.' }],
    test_steps: [{ command: 'npx @modelcontextprotocol/inspector --help', expected: 'Inspector help or usage output is displayed.', evidence_required: 'Command output and exit code.' }],
    example_project: { name: 'Weather Tool Server', objective: 'Expose weather-style tool calls following the official server guide.', acceptance: ['Server starts', 'Inspector connects', 'Tool call returns structured result'] },
    aptitude_test: { pass_threshold: 80, questions: [{ prompt: 'Why should stdio MCP servers avoid stdout logging?', answer: 'Stdout carries JSON-RPC messages; logging there can corrupt the protocol stream.' }] },
    multimodal_assets: { gemini_voice_prompt: 'Explain MCP servers as capability providers with tools, resources, and prompts.', video_outline: ['Server concepts', 'Tool registration', 'Inspector validation'], visual_aids: ['Server-to-host sequence diagram'] },
  }),
  lesson(4, {
    lesson_id: 'mcp-build-client',
    course_id: 'mcp-foundations',
    title: 'Build MCP Clients',
    summary: 'Build clients that initialize MCP servers, list tools, call tools, and pass results back to an LLM loop.',
    docs_url: 'https://modelcontextprotocol.io/docs/develop/build-client',
    docs_urls: ['https://modelcontextprotocol.io/docs/develop/build-client'],
    learning_outcomes: ['Explain client/server transport lifecycle', 'List and call MCP tools', 'Protect API keys and environment variables'],
    prerequisites: ['MCP server lesson', 'LLM tool-call basics'],
    install_steps: [{ command: 'python3 --version || node --version', expected: 'At least one supported runtime version prints.', evidence_required: 'Actual command output and exit code.' }],
    test_steps: [{ command: 'node --version', expected: 'Node version prints successfully for TypeScript client work.', evidence_required: 'Command output and exit code.' }],
    example_project: { name: 'CLI MCP Client', objective: 'Connect to a local server, list tools, and call one tool.', acceptance: ['Initialize succeeds', 'tools/list returns tool metadata', 'tools/call result is displayed'] },
    aptitude_test: { pass_threshold: 80, questions: [{ prompt: 'What does an MCP client do before calling tools?', answer: 'It connects to a server and initializes the MCP session/capabilities.' }] },
    multimodal_assets: { gemini_voice_prompt: 'Explain clients as the bridge between LLM reasoning and server capabilities.', video_outline: ['Client setup', 'Initialize', 'Tool loop'], visual_aids: ['LLM-tool-result loop diagram'] },
  }),
  lesson(5, {
    lesson_id: 'mcp-apps',
    course_id: 'mcp-apps-ui',
    title: 'Build MCP Apps',
    summary: 'Render interactive HTML UIs inside MCP hosts using UI resources, sandboxed iframes, and bidirectional communication.',
    docs_url: 'https://modelcontextprotocol.io/extensions/apps/overview',
    docs_urls: ['https://modelcontextprotocol.io/extensions/apps/overview'],
    learning_outcomes: ['Explain why MCP Apps differ from standalone web apps', 'Identify _meta.ui.resourceUri', 'Describe sandbox and postMessage security'],
    prerequisites: ['MCP server concepts', 'Basic web UI knowledge'],
    install_steps: [{ command: 'node --version && npm --version', expected: 'Node and npm versions print successfully.', evidence_required: 'Actual command output and exit code.' }],
    test_steps: [{ command: 'npm --version', expected: 'npm version prints successfully.', evidence_required: 'Command output and exit code.' }],
    example_project: { name: 'Interactive Lesson Viewer App', objective: 'Serve an HTML UI resource from an MCP tool.', acceptance: ['Tool references UI resource', 'Host fetches resource', 'UI communicates through the app protocol'] },
    aptitude_test: { pass_threshold: 80, questions: [{ prompt: 'What field links a tool to an MCP App UI resource?', answer: '_meta.ui.resourceUri.' }] },
    multimodal_assets: { gemini_voice_prompt: 'Explain MCP Apps as conversation-native interactive UI.', video_outline: ['Tool metadata', 'Resource fetch', 'Sandbox communication'], visual_aids: ['MCP App sequence diagram'] },
  }),
  lesson(6, {
    lesson_id: 'mcp-ui',
    course_id: 'mcp-apps-ui',
    title: 'MCP UI Kit',
    summary: 'Use MCP UI host/client patterns for rendering UI resources and handling app events.',
    docs_url: 'https://github.com/MCP-UI-Org/mcp-ui',
    docs_urls: ['https://github.com/MCP-UI-Org/mcp-ui', 'https://mcpui.dev/'],
    learning_outcomes: ['Explain UI-over-MCP', 'Identify host rendering responsibilities', 'Use UI resources without bypassing sandbox constraints'],
    prerequisites: ['React or web component basics', 'MCP Apps overview'],
    install_steps: [{ command: 'npm view @mcp-ui/client version', expected: 'Package version is returned from npm.', evidence_required: 'Actual command output and exit code.' }],
    test_steps: [{ command: 'npm view @mcp-ui/server version', expected: 'Package version is returned from npm.', evidence_required: 'Command output and exit code.' }],
    example_project: { name: 'MCP UI Renderer Probe', objective: 'Render a UI resource and handle host callbacks.', acceptance: ['Package versions verified', 'Renderer integration documented', 'Sandbox limits described'] },
    aptitude_test: { pass_threshold: 80, questions: [{ prompt: 'What is the host responsible for when rendering MCP UI?', answer: 'Fetching/rendering UI resources safely and mediating interactions such as messages and links.' }] },
    multimodal_assets: { gemini_voice_prompt: 'Explain MCP UI as the host-side rendering layer for interactive protocol apps.', video_outline: ['Package roles', 'Renderer flow', 'Security callbacks'], visual_aids: ['Host/app boundary diagram'] },
  }),
  lesson(7, {
    lesson_id: 'mcp-app-bridge',
    course_id: 'mcp-apps-ui',
    title: 'MCP App Bridge',
    summary: 'Understand sandboxed iframe rendering, message passing, tool-call proxying, and security policy enforcement.',
    docs_url: 'https://apps.extensions.modelcontextprotocol.io/api/modules/app-bridge.html',
    docs_urls: ['https://apps.extensions.modelcontextprotocol.io/api/modules/app-bridge.html'],
    learning_outcomes: ['Describe AppBridge responsibilities', 'Explain allow/CSP boundaries', 'Connect App Bridge concepts to MCP Apps'],
    prerequisites: ['MCP Apps overview', 'iframe/postMessage basics'],
    install_steps: [{ command: 'node --version', expected: 'Node version prints successfully.', evidence_required: 'Actual command output and exit code.' }],
    test_steps: [{ command: 'node -e "console.log(new URL(\\"https://apps.extensions.modelcontextprotocol.io/api/modules/app-bridge.html\\").hostname)"', expected: 'apps.extensions.modelcontextprotocol.io is printed.', evidence_required: 'Command output and exit code.' }],
    example_project: { name: 'Bridge Security Checklist', objective: 'Create a host/app checklist for iframe permissions, CSP, and tool-call proxying.', acceptance: ['Permissions listed', 'CSP domains listed', 'Tool proxy boundary documented'] },
    aptitude_test: { pass_threshold: 80, questions: [{ prompt: 'Why does the App Bridge use a sandboxed iframe?', answer: 'To isolate the app from the host while allowing controlled communication.' }] },
    multimodal_assets: { gemini_voice_prompt: 'Explain App Bridge as the safety boundary for rendering apps inside AI hosts.', video_outline: ['Iframe sandbox', 'Message protocol', 'Tool proxy'], visual_aids: ['Sandbox boundary diagram'] },
  }),
  lesson(8, {
    lesson_id: 'basic-server-react',
    course_id: 'mcp-apps-ui',
    title: 'Basic Server React',
    summary: 'Start MCP App projects from the official React server example and compare its UI/resource structure.',
    docs_url: 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-react',
    docs_urls: ['https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-react'],
    learning_outcomes: ['Identify React app entry points', 'Explain single-file Vite bundling for UI resources', 'Test the example server locally'],
    prerequisites: ['Node/npm', 'React basics'],
    install_steps: [{ command: 'npm --version', expected: 'npm version prints successfully.', evidence_required: 'Actual command output and exit code.' }],
    test_steps: [{ command: 'npm run build', expected: 'Example project build succeeds when run inside the example checkout.', evidence_required: 'Build log and exit code from real checkout.' }],
    example_project: { name: 'React MCP Lesson Card', objective: 'Adapt the React example into a lesson-card MCP App.', acceptance: ['Build succeeds', 'Tool links UI resource', 'UI receives tool result'] },
    aptitude_test: { pass_threshold: 80, questions: [{ prompt: 'What build tool bundles the React example into a single HTML resource?', answer: 'Vite with vite-plugin-singlefile, according to the example README.' }] },
    multimodal_assets: { gemini_voice_prompt: 'Walk through the React starter as a practical MCP App template.', video_outline: ['File layout', 'Build', 'Tool-to-UI flow'], visual_aids: ['React example file map'] },
  }),
  lesson(9, {
    lesson_id: 'basic-server-svelte',
    course_id: 'mcp-apps-ui',
    title: 'Basic Server Svelte',
    summary: 'Use the official Svelte 5 MCP App example to compare framework ergonomics against React.',
    docs_url: 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-svelte',
    docs_urls: ['https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-server-svelte'],
    learning_outcomes: ['Identify Svelte app entry points', 'Compare Svelte and React MCP App structure', 'Test the Svelte example build'],
    prerequisites: ['Node/npm', 'Svelte basics helpful'],
    install_steps: [{ command: 'npm --version', expected: 'npm version prints successfully.', evidence_required: 'Actual command output and exit code.' }],
    test_steps: [{ command: 'npm run build', expected: 'Example project build succeeds when run inside the example checkout.', evidence_required: 'Build log and exit code from real checkout.' }],
    example_project: { name: 'Svelte MCP Lesson Card', objective: 'Adapt the Svelte example into the same lesson-card app built in React.', acceptance: ['Build succeeds', 'Tool links UI resource', 'Comparison notes cite real differences'] },
    aptitude_test: { pass_threshold: 80, questions: [{ prompt: 'What framework version does the example README identify?', answer: 'Svelte 5 using runes for reactivity.' }] },
    multimodal_assets: { gemini_voice_prompt: 'Compare Svelte and React starter ergonomics without inventing framework claims.', video_outline: ['File layout', 'Runes note', 'Comparison'], visual_aids: ['React vs Svelte file map'] },
  }),
  lesson(10, {
    lesson_id: 'transcript-server',
    course_id: 'mcp-media-utilities',
    title: 'Transcript Server',
    summary: 'Deploy and test a live transcription MCP App using the browser Web Speech API and model context updates.',
    docs_url: 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/transcript-server',
    docs_urls: ['https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/transcript-server'],
    learning_outcomes: ['Explain live transcription flow', 'Identify microphone permission requirements', 'Test transcript send/clear controls'],
    prerequisites: ['Browser with Web Speech API support', 'Microphone permission'],
    install_steps: [{ command: 'npm --version', expected: 'npm version prints successfully.', evidence_required: 'Actual command output and exit code.' }],
    test_steps: [{ command: 'npm run dev', expected: 'Transcript server starts from the example checkout.', evidence_required: 'Server log, browser support note, and exit/stop evidence.' }],
    example_project: { name: 'Voice-to-Lesson Notes', objective: 'Capture spoken lesson notes and send transcript text to the host.', acceptance: ['Microphone permission declared', 'Transcript appears', 'Send action reaches host'] },
    aptitude_test: { pass_threshold: 80, questions: [{ prompt: 'What browser capability powers the transcript server?', answer: 'The Web Speech API.' }] },
    multimodal_assets: { gemini_voice_prompt: 'Explain how transcription turns voice into retrievable lesson/project context.', video_outline: ['Permission', 'Start/stop', 'Send to host'], visual_aids: ['Speech-to-context flow'] },
  }),
  lesson(11, {
    lesson_id: 'video-resource-server',
    course_id: 'mcp-media-utilities',
    title: 'Video Resource Server',
    summary: 'Serve binary video through MCP resources using base64 blob resource patterns and a video UI.',
    docs_url: 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/video-resource-server',
    docs_urls: ['https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/video-resource-server'],
    learning_outcomes: ['Explain binary resource delivery', 'Identify video resource URI flow', 'Test video playback from MCP resource data'],
    prerequisites: ['MCP resources', 'Browser video playback basics'],
    install_steps: [{ command: 'npm --version', expected: 'npm version prints successfully.', evidence_required: 'Actual command output and exit code.' }],
    test_steps: [{ command: 'npm run dev', expected: 'Video resource server starts from the example checkout.', evidence_required: 'Server log and playback verification notes.' }],
    example_project: { name: 'Lesson Video Resource Player', objective: 'Load a lesson video through an MCP resource URI.', acceptance: ['Resource read succeeds', 'Blob decodes', 'Video plays in UI'] },
    aptitude_test: { pass_threshold: 80, questions: [{ prompt: 'How does the example describe serving video content?', answer: 'The tool returns a video URI, the view reads the MCP resource, decodes a base64 blob, and plays it.' }] },
    multimodal_assets: { gemini_voice_prompt: 'Explain why video is high-bandwidth communication and how MCP resources carry it.', video_outline: ['Tool URI', 'Resource read', 'Playback'], visual_aids: ['Binary resource flow'] },
  }),
  lesson(12, {
    lesson_id: 'say-server',
    course_id: 'mcp-media-utilities',
    title: 'Say Server Text To Speech',
    summary: 'Deploy and test streaming TTS for transcripts, avatars, and video narration using the official say-server example.',
    docs_url: 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/say-server',
    docs_urls: ['https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/say-server'],
    learning_outcomes: ['Explain streaming TTS queue flow', 'Identify hidden app-only tools', 'Test voice playback with attribution constraints'],
    prerequisites: ['uv package manager', 'Audio playback environment'],
    install_steps: [{ command: 'uv --version', expected: 'uv version prints successfully.', evidence_required: 'Actual command output and exit code.' }],
    test_steps: [{ command: 'uv run https://raw.githubusercontent.com/modelcontextprotocol/ext-apps/main/examples/say-server/server.py --stdio', expected: 'Server starts in stdio mode when connected by an MCP host.', evidence_required: 'Real host or inspector connection log; do not simulate.' }],
    example_project: { name: 'Transcript-to-Avatar Voice', objective: 'Convert a verified transcript into spoken narration.', acceptance: ['TTS server runs', 'Audio plays', 'Voice license/attribution recorded'] },
    aptitude_test: { pass_threshold: 80, questions: [{ prompt: 'What package manager does the say-server quick start use?', answer: 'uv.' }] },
    multimodal_assets: { gemini_voice_prompt: 'Explain TTS as the bridge from transcript text to voice-driven avatars and videos.', video_outline: ['Queue concept', 'Playback', 'Licensing'], visual_aids: ['Text-to-audio queue diagram'] },
  }),
  lesson(13, {
    lesson_id: 'qr-server',
    course_id: 'mcp-media-utilities',
    title: 'QR Server',
    summary: 'Generate QR codes for launching apps and content without forcing users to type URLs or phone numbers.',
    docs_url: 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/qr-server',
    docs_urls: ['https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/qr-server'],
    learning_outcomes: ['Explain QR code generation parameters', 'Test a generated QR image', 'Use QR launch links responsibly'],
    prerequisites: ['uv package manager', 'QR scanner for end-to-end test'],
    install_steps: [{ command: 'uv --version', expected: 'uv version prints successfully.', evidence_required: 'Actual command output and exit code.' }],
    test_steps: [{ command: 'uv run server.py --stdio', expected: 'QR server starts from the example checkout in stdio mode.', evidence_required: 'Server startup and generated QR evidence from real run.' }],
    example_project: { name: 'VCU Lesson Launch QR', objective: 'Generate a QR code that opens a verified lesson URL.', acceptance: ['QR generated', 'Scan opens intended URL', 'No sensitive data embedded'] },
    aptitude_test: { pass_threshold: 80, questions: [{ prompt: 'What required parameter does generate_qr need?', answer: 'text, the string or URL to encode.' }] },
    multimodal_assets: { gemini_voice_prompt: 'Explain QR codes as compact launchers for apps, lessons, and content.', video_outline: ['Parameters', 'Generate', 'Scan test'], visual_aids: ['QR generation parameter table'] },
  }),
  lesson(14, {
    lesson_id: 'map-server',
    course_id: 'mcp-media-utilities',
    title: 'Map Server Without Google',
    summary: 'Use the official map server example to show maps with OpenStreetMap/Nominatim and no Google Maps dependency.',
    docs_url: 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/map-server',
    docs_urls: ['https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/map-server'],
    learning_outcomes: ['Explain geocoding and map display tools', 'Identify non-Google map dependencies', 'Test a location on the globe UI'],
    prerequisites: ['Node/npm', 'Network access to map/geocoding services'],
    install_steps: [{ command: 'npm --version', expected: 'npm version prints successfully.', evidence_required: 'Actual command output and exit code.' }],
    test_steps: [{ command: 'npm run start:http', expected: 'Map server starts from the example checkout over HTTP.', evidence_required: 'Startup log and real map/geocode verification.' }],
    example_project: { name: 'Open Map Business Locator', objective: 'Show an open map for a business or project location.', acceptance: ['Geocode returns coordinates', 'Map renders location', 'Attribution/rate-limit notes recorded'] },
    aptitude_test: { pass_threshold: 80, questions: [{ prompt: 'Which geocoding service does the map example mention?', answer: 'OpenStreetMap Nominatim.' }] },
    multimodal_assets: { gemini_voice_prompt: 'Explain open mapping without Google and the responsibilities around attribution and rate limits.', video_outline: ['Geocode', 'Show map', 'Attribution'], visual_aids: ['Geocode-to-globe flow'] },
  }),
  lesson(15, {
    lesson_id: 'final-video-builder',
    course_id: 'vcu-final-projects',
    title: 'Final Project: Voice Video Builder',
    summary: 'Build an app that turns voice/transcripts into narrated videos and publishes them with verified MCP media tools.',
    docs_url: 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/video-resource-server',
    docs_urls: ['https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/transcript-server', 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/say-server', 'https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/video-resource-server'],
    learning_outcomes: ['Combine transcript, TTS, and video resource lessons', 'Define a real publish workflow', 'Verify media generation without mock evidence'],
    prerequisites: ['Transcript Server', 'Say Server', 'Video Resource Server'],
    install_steps: [{ command: 'npm --version && uv --version', expected: 'npm and uv versions print successfully.', evidence_required: 'Actual command output and exit codes.' }],
    test_steps: [{ command: 'npm run build', expected: 'Final project app build succeeds in its real project directory.', evidence_required: 'Build log and exit code from real project.' }],
    example_project: { name: 'Voice Video Publisher', objective: 'Create narrated lesson videos from spoken transcripts.', acceptance: ['Transcript captured', 'TTS audio produced', 'Video resource plays', 'Publish target documented'] },
    aptitude_test: { pass_threshold: 85, questions: [{ prompt: 'Which three lesson areas does the video builder combine?', answer: 'Transcription, text-to-speech, and video resources.' }] },
    multimodal_assets: { gemini_voice_prompt: 'Guide the student through planning a voice-driven video publisher using only verified components.', video_outline: ['Capture', 'Narrate', 'Render/publish'], visual_aids: ['Media pipeline diagram'] },
  }),
  lesson(16, {
    lesson_id: 'final-sellable-app',
    course_id: 'vcu-final-projects',
    title: 'Final Project: Sellable MCP App',
    summary: 'Build a real app you can sell using MCP servers, Apps, UI resources, project tasks, and no-mock verification.',
    docs_url: 'https://modelcontextprotocol.io/extensions/apps/overview',
    docs_urls: ['https://modelcontextprotocol.io/docs/develop/build-server', 'https://modelcontextprotocol.io/docs/develop/build-client', 'https://modelcontextprotocol.io/extensions/apps/overview', 'https://github.com/MCP-UI-Org/mcp-ui'],
    learning_outcomes: ['Define a sellable app problem', 'Build MCP-backed functionality', 'Use project/task state and acceptance evidence'],
    prerequisites: ['MCP Foundations', 'MCP Apps And UI', 'At least one utility server lesson'],
    install_steps: [{ command: 'node --version && npm --version', expected: 'Node and npm versions print successfully.', evidence_required: 'Actual command output and exit codes.' }],
    test_steps: [{ command: 'npm run build && npm run test', expected: 'Final project build and tests pass in the real project.', evidence_required: 'Build/test logs and exit codes from real project.' }],
    example_project: { name: 'Paid MCP Utility App', objective: 'Ship a useful MCP App with a clear customer, capability, and test plan.', acceptance: ['Customer problem documented', 'MCP server/app works', 'Tests pass', 'No-mock review accepted'] },
    aptitude_test: { pass_threshold: 85, questions: [{ prompt: 'What must be true before final project work is accepted?', answer: 'The no-mock gate must pass with real install, test, and review evidence.' }] },
    multimodal_assets: { gemini_voice_prompt: 'Coach the student from product idea to verified sellable app without skipping evidence.', video_outline: ['Choose problem', 'Build MCP capability', 'Verify and package'], visual_aids: ['Product-to-MCP architecture map'] },
  }),
];

export const VCU_AGENT_SKILLS: VcuAgentSkillManifest[] = [
  {
    agent_skill_id: 'vcu-lesson-builder',
    name: 'VCU Lesson Builder',
    description: 'Builds source-backed lesson packages with no mock evidence.',
    trigger_terms: ['VCU lesson', 'MCP curriculum', 'lesson package', 'populate university'],
    docs_urls: requiredMcpDocsUrls,
    cursor_rule_paths: ['.cursor/rules/vcu-no-mock-acceptance.mdc', '.cursor/rules/vcu-api-docs-sources.mdc'],
    cursor_skill_path: '.cursor/skills/vcu-lesson-builder/SKILL.md',
    agent_prompt_path: 'docs/vcu/agents/vcu-lesson-builder-agent.md',
    tool_ids: ['D_knowledge_manager', 'M_triangulation', 'N_coding_agent'],
    resource_refs: [{ type: 'docs_registry', uri: 'docs/vcu/api-docs.md' }],
    verification_status: 'review_pending',
    no_mock_verified: false,
    enabled: true,
  },
  {
    agent_skill_id: 'vcu-lesson-reviewer',
    name: 'VCU Lesson Reviewer',
    description: 'Reviews lessons for source truth, no-mock compliance, install/test evidence, and publish readiness.',
    trigger_terms: ['review VCU lesson', 'triangulate lesson', 'no mock gate', 'publish lesson'],
    docs_urls: requiredMcpDocsUrls,
    cursor_rule_paths: ['.cursor/rules/vcu-no-mock-acceptance.mdc', '.cursor/rules/vcu-triangulation-gate.mdc'],
    cursor_skill_path: '.cursor/skills/vcu-lesson-reviewer/SKILL.md',
    agent_prompt_path: 'docs/vcu/agents/vcu-lesson-reviewer-agent.md',
    tool_ids: ['M_triangulation', 'D_knowledge_manager'],
    resource_refs: [{ type: 'docs_registry', uri: 'docs/vcu/api-docs.md' }],
    verification_status: 'review_pending',
    no_mock_verified: false,
    enabled: true,
  },
  {
    agent_skill_id: 'vcu-agent-task-planner',
    name: 'VCU Agent Task Planner',
    description: 'Turns accepted lesson knowledge into source-backed project/task instructions for Gemini Voice AI and Rust coding agents.',
    trigger_terms: ['create task', 'assign Rust coding agent', 'Gemini project task', 'VCU project'],
    docs_urls: requiredMcpDocsUrls,
    cursor_rule_paths: ['.cursor/rules/vcu-no-mock-acceptance.mdc', '.cursor/rules/vcu-supabase-project-tasks.mdc'],
    cursor_skill_path: '.cursor/skills/vcu-agent-task-planner/SKILL.md',
    agent_prompt_path: 'docs/vcu/agents/vcu-agent-task-planner-agent.md',
    tool_ids: ['N_coding_agent', 'O_router'],
    resource_refs: [{ type: 'schema', uri: 'supabase/migrations/002_vcu_university_schema.sql' }],
    verification_status: 'review_pending',
    no_mock_verified: false,
    enabled: true,
  },
];

export const MCP_SDK_REGISTRY: McpSdkRegistryManifest[] = [
  {
    registry_id: 'rust-sdk-tools',
    source_name: 'Rust MCP SDK',
    source_url: 'https://github.com/modelcontextprotocol/rust-sdk',
    sdk_language: 'rust',
    protocol_version: null,
    capability_type: 'tool',
    capability_name: 'Rust tool handlers',
    schema_ref: 'rmcp tool macros and ServerHandler',
    docs_summary: 'Official Rust SDK source for building MCP servers with tool handlers and server lifecycle code.',
    verification_status: 'review_pending',
  },
  {
    registry_id: 'schema-2025-11-25',
    source_name: 'MCP TypeScript schema',
    source_url: 'https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2025-11-25/schema.ts',
    sdk_language: 'typescript',
    protocol_version: '2025-11-25',
    capability_type: 'schema',
    capability_name: 'Protocol schema',
    schema_ref: 'LATEST_PROTOCOL_VERSION and JSON-RPC interfaces',
    docs_summary: 'Canonical schema source for protocol messages, capabilities, tools, resources, tasks, and elicitation.',
    verification_status: 'review_pending',
  },
  {
    registry_id: 'mcp-apps-ui-resource',
    source_name: 'MCP Apps',
    source_url: 'https://modelcontextprotocol.io/extensions/apps/overview',
    sdk_language: null,
    protocol_version: null,
    capability_type: 'app',
    capability_name: 'Tool-linked UI resource',
    schema_ref: '_meta.ui.resourceUri',
    docs_summary: 'MCP Apps pattern for rendering interactive HTML resources inside MCP hosts.',
    verification_status: 'review_pending',
  },
  {
    registry_id: 'app-bridge-sandbox',
    source_name: 'MCP App Bridge',
    source_url: 'https://apps.extensions.modelcontextprotocol.io/api/modules/app-bridge.html',
    sdk_language: 'typescript',
    protocol_version: null,
    capability_type: 'bridge',
    capability_name: 'Sandboxed app rendering bridge',
    schema_ref: 'AppBridge',
    docs_summary: 'API reference for sandbox iframe rendering, message passing, tool proxying, and security controls.',
    verification_status: 'review_pending',
  },
];

function globalArtifact(
  artifact_id: string,
  artifact_type: VcuBehaviorArtifactType,
  title: string,
  uri: string,
  description: string,
): VcuBehaviorArtifactManifest {
  return {
    artifact_id,
    artifact_type,
    title,
    uri,
    description,
    docs_urls: requiredMcpDocsUrls,
    lesson_bindings: VCU_LESSONS.map((lessonEntry) => lessonEntry.lesson_id),
    verification_status: 'review_pending',
    no_mock_status: 'review_pending',
    reviewer_notes: 'Cataloged globally; requires real reviewer acceptance and link-check evidence before verified status.',
    usage_constraints: {
      stores_private_prompt_contents: false,
      link_check_status: 'unverified',
      evidence_required: 'Real source-doc review, no-mock review notes, and file hash recorded by importer.',
    },
  };
}

export const VCU_BEHAVIOR_ARTIFACTS: VcuBehaviorArtifactManifest[] = [
  globalArtifact('global-rule-vcu-no-mock-acceptance', 'cursor_rule', 'VCU no-mock acceptance rule', '.cursor/rules/vcu-no-mock-acceptance.mdc', 'Global no-mock gate for VCU lesson, skill, prompt, Supabase, and coding-agent work.'),
  globalArtifact('global-rule-vcu-api-docs-sources', 'cursor_rule', 'VCU API docs source rule', '.cursor/rules/vcu-api-docs-sources.mdc', 'Global approved primary-docs manifest rule for VCU curriculum artifacts.'),
  globalArtifact('global-rule-vcu-triangulation-gate', 'cursor_rule', 'VCU triangulation gate rule', '.cursor/rules/vcu-triangulation-gate.mdc', 'Global peer-review and triangulation gate for accepting VCU work.'),
  globalArtifact('global-rule-vcu-supabase-project-tasks', 'cursor_rule', 'VCU Supabase project/task rule', '.cursor/rules/vcu-supabase-project-tasks.mdc', 'Global Supabase project/task state rule for VCU and Gemini Voice AI task handoff.'),
  globalArtifact('global-rule-skillshub-authority-gate', 'cursor_rule', 'Skillshub authority gate rule', '.cursor/rules/skillshub-authority-gate.mdc', 'Global Cursor rule for skillshub tap discovery, allowed-tools metadata, and AI OS skill/tool authority gating.'),
  globalArtifact('global-skill-vcu-lesson-builder', 'cursor_skill', 'VCU lesson builder skill', '.cursor/skills/vcu-lesson-builder/SKILL.md', 'Global Cursor skill for building source-backed VCU lesson packages.'),
  globalArtifact('global-skill-vcu-lesson-reviewer', 'cursor_skill', 'VCU lesson reviewer skill', '.cursor/skills/vcu-lesson-reviewer/SKILL.md', 'Global Cursor skill for reviewing VCU lessons against primary docs and no-mock evidence.'),
  globalArtifact('global-skill-vcu-agent-task-planner', 'cursor_skill', 'VCU agent task planner skill', '.cursor/skills/vcu-agent-task-planner/SKILL.md', 'Global Cursor skill for converting accepted lessons into source-backed project/task plans.'),
  globalArtifact('global-skill-rust-native-skills-manager', 'cursor_skill', 'Rust native skills manager skill', '.cursor/skills/rust-native-skills-manager/SKILL.md', 'Global Cursor skill for installing, validating, listing, pushing, importing, rendering, and syncing skills through the Rust skills CLI protocol.'),
  globalArtifact('global-skill-skillshub-authority-manager', 'cursor_skill', 'Skillshub authority manager skill', '.cursor/skills/skillshub-authority-manager/SKILL.md', 'Global Cursor skill for managing skillshub taps, agent linking, allowed-tools metadata, and AI OS role/scope/tool authority gates.'),
  globalArtifact('global-agent-vcu-lesson-builder', 'agent_prompt', 'VCU lesson builder agent prompt', 'docs/vcu/agents/vcu-lesson-builder-agent.md', 'Global agent prompt for building VCU lesson packages.'),
  globalArtifact('global-agent-vcu-lesson-reviewer', 'agent_prompt', 'VCU lesson reviewer agent prompt', 'docs/vcu/agents/vcu-lesson-reviewer-agent.md', 'Global agent prompt for independent no-mock VCU lesson review.'),
  globalArtifact('global-agent-vcu-agent-task-planner', 'agent_prompt', 'VCU agent task planner agent prompt', 'docs/vcu/agents/vcu-agent-task-planner-agent.md', 'Global agent prompt for VCU project/task planning.'),
  globalArtifact('global-doc-vcu-api-docs', 'docs_registry', 'VCU API docs registry', 'docs/vcu/api-docs.md', 'Global Markdown registry of required VCU primary docs.'),
  globalArtifact('global-doc-vcu-lesson-artifacts', 'docs_registry', 'VCU lesson artifact index', 'docs/vcu/lesson-artifacts.md', 'Global Markdown index for VCU global artifacts and per-lesson artifact targets.'),
  globalArtifact('global-doc-ai-os-shell-state-governance', 'docs_registry', 'AI OS shell state governance', 'docs/vcu/ai-os-shell-state-governance.md', 'Governing document for role journey, shell state, skill mapping, bounded tool authority, and platform economics.'),
  globalArtifact('global-doc-vcu-identity-alignment-amendment', 'docs_registry', 'VCU identity alignment amendment', 'governing_docs/amendments/AMD-2026-010.md', 'Draft constitutional amendment for VCU audience alignment, selective admission, People Over Profits, and value-first funnel governance.'),
  globalArtifact('global-schema-vcu-university', 'schema', 'VCU Supabase migration schema', 'supabase/migrations/002_vcu_university_schema.sql', 'Supabase schema for VCU courses, lessons, artifacts, skills, registry, projects, tasks, and behavior artifacts.'),
  globalArtifact('global-schema-native-skill-protocol', 'schema', 'Native skill protocol registry schema', 'supabase/migrations/005_native_skill_protocol.sql', 'Supabase schema for the Rust skills CLI protocol and deployment evidence records.'),
  globalArtifact('global-schema-skillshub-authority-gate', 'schema', 'Skillshub authority gate registry schema', 'supabase/migrations/006_skillshub_authority_gate.sql', 'Supabase schema for skillshub protocol metadata, taps, allowed tools, intent permission profiles, and authority evidence.'),
  globalArtifact('global-schema-supabase-types', 'schema', 'Supabase TypeScript database types', 'src/lib/supabaseTypes.ts', 'TypeScript database shape for VCU tables and importer code.'),
  globalArtifact('global-seed-vcu-curriculum', 'seed_importer', 'VCU curriculum manifest', 'src/vcu/vcuCurriculum.ts', 'Source-backed VCU courses, lessons, agent skills, MCP registry, and behavior artifact manifests.'),
  globalArtifact('global-seed-supabase-importer', 'seed_importer', 'Supabase seed importer', 'scripts/seed-supabase.ts', 'Deterministic importer that seeds VCU catalog state and reports review-pending artifact targets.'),
  globalArtifact('global-seed-native-skills-cli-importer', 'seed_importer', 'Native skills CLI importer', 'scripts/import-native-skills-cli-registry.ts', 'Source-backed importer for crates.io skills CLI protocol metadata, native commands, dependencies, and Cursor actions.'),
  globalArtifact('global-seed-skillshub-importer', 'seed_importer', 'Skillshub authority importer', 'scripts/import-skillshub-registry.ts', 'Source-backed importer for skillshub protocol metadata, taps, allowed tools, permission profiles, and Cursor actions.'),
];
