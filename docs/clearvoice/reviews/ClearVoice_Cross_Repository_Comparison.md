# ClearVoice component selection across repositories

October 26, 2026 — source review and extraction recommendation

## Decision

Build ClearVoice from selected modules with preserved provenance. Use `ai-os-voice-interface` for the shell/menu contracts and desktop adapter boundary; use `ai-biz-bot` as the principal source for integrated voice selection, audio lifecycle, behavioral controls, knowledge library, and telephony. Borrow bounded conversation/modality helpers from browser-chat. Preserve the older Twilio manager's interaction design while replacing simulated call behavior with verified server operations.

This is component selection, not approval to deploy any repository unchanged. HETIBANK website work remains separate; its V1 stays on ChatGPT, with ClearVoice integration reserved for V2.

## Snapshot scope

| Repository | Reviewed snapshot | Role |
|---|---|---|
| ai-os-voice-interface | 92c2783a3df3fbca4cb7250dc43daff70825face | Earlier source review; reference shell and menus |
| ai-biz-bot | 6b88604d576156c6748327e50664146e99071c4d | Rich integrated implementation |
| gateway-global-ai-browser-chat | b10dc395c42cf45509d1d44ec5ecf4b2f0c157e0 | Conversation and modality helpers; earlier designs |
| ai-chat | bf3578a215e159e183679272ea1cdb107bad7009 | Earlier behavioral/backend and telephony work |
| twilio-telephony-voice-ai | 2b9c75eb4cffbfa102e6db89e35f5a905a0cfceb | Dedicated Twilio manager design and Gemini proxy |

Complete recursive trees retrieved for the four newly compared repos. A targeted set of 35 implementation/design files was materialized, plus additional route mounts, schema, behavioral compiler/validator, and widget sources were read through GitHub. This is a focused component review, not a full security audit or build certification. Archived variants and non-default branches were not exhaustively reviewed.

## Selection matrix

“Best” below means strongest source candidate for the specific responsibility, based on implementation depth and wiring inspected, not proven production reliability.

| Component | Recommended source | What is present | Required work before acceptance |
|---|---|---|---|
| Shell and menu engine | ai-os-voice-interface | Typed records, nesting/stack, detail surfaces, guest filtering, shared navigation, theme/layout tokens | Server permissions, durable state/audit, theme consolidation |
| Integrated chat/voice host | ai-biz-bot ConciergePanel | Voice/chat presentation, inline configuration, knowledge and task panels, visualizer, agent settings | Extract responsibilities rather than transplant the very large component |
| Voice persona selector | ai-biz-bot VoiceSelector | Eight named voices, compact/full card grids, selected/disabled states | Provider capability registry, preview, persist/apply confirmation, unsupported voice handling |
| Voice settings | ai-biz-bot VoiceSettings | Streaming/PTT tabs, analysis toggles, health fetches, settings callback and site-config save wiring | Replace placeholder metrics, separate actual runtime controls from descriptive UI |
| Audio transport/lifecycle | ai-biz-bot GeminiStreamingClient and voiceTurnOrchestrator | Streaming audio, cleanup, output-volume tracking, interruption interface, canvas-before-narration sequencing | End-to-end reconnect/cancel/duplex tests and provider-independent contracts |
| Audio-reactive visualizer | ai-biz-bot VoiceVisualizerBars | Main chat passes input/output volume; distinct recording/processing/speaking states | Verify live meters, silence, reduced motion, clipping, lifecycle cleanup |
| Alternative visualizer styles | ai-biz-bot VoiceVisualizerWidget | Canvas bars/orb/waveform styles accept an AnalyserNode; ChatVoiceWidget instantiates the analyser widget | Confirm production mounting; repair waveform math, resizing, silence and lifecycle edge cases |
| Orbital status display | ai-os-voice-interface OrbitalVisualizer | Ready/listening/processing/speaking/error/offline styling | Keep as state indicator, not an audio meter; optionally bind real levels |
| DISC/ARCH | ai-biz-bot controls plus promptCompiler and archEnvelopeValidator | Saved profiles, operational mode overrides, no-drift prompt constraints, chat output validation | Define channel parity; validate model output without treating prompts as enforceable security |
| Modality-aware behavioral profile | browser-chat ModalitySwitcher | Deterministic dominant-DISC adjustments to modality-specific ARCH values, clamped 0–100 | Resolve scales/defaults/ties, test policy and integration before adoption |
| Shared voice/text thread | browser-chat useConversation/ConversationView concepts | One ID and message stream across voice/text, topic switch functions | Replace simulate-voice path; isolate thread messages, persistence, actor/tenant namespacing |
| Knowledge Library | ai-biz-bot KnowledgeManager and knowledge-routes | Public/private artifacts, site scope, add/delete, activation/deactivation, content retrieval, ingestion entrypoint | Fix authorization and session binding; demonstrate retrieval actually reaches each voice/chat channel |
| Telephone/firewall control surface | ai-biz-bot TelephonyManager plus original dedicated Twilio design | Phone/Firewall/History UI; number and account management; provisioning, calls, SMS, callbacks | Fix firewall semantics, tenant binding, authenticated admin routes, credential lifecycle |
| PSTN server path | ai-biz-bot telephonyRoutes/twilio adapters/stream handlers | TwiML voice/stream endpoints, signature checks on main voice paths, call history/status and routing | Normalize numbers, deny/allow contract, signed stream/session binding, failover and abuse/cost limits |

## The Twilio “phone and firewall” system

This was a distinct control-plane concept, not simply a call button:

- Phone number provisioning, existing-number connection, webhook management, caller-ID settings.
- Account/subaccount management and owner/business management surfaces.
- Inbound caller allowlist/firewall and owner-oriented controls.
- Outbound calls and SMS, call/message history, status/error callbacks, health/diagnostics.
- Browser AI and PSTN transport paths, with local/sovereign stream code as a separate option.

`ai-biz-bot/client/src/App.tsx` mounts `/telephony` and `/twilio-account`. `server/routes.ts` mounts telephonyRoutes and businessTelephonyRoutes. This provides substantially better evidence of an integrated product than the earlier UI-only simulator paths.

### Verified firewall mismatch — release blocker

The TelephonyManager UI says an enabled firewall with an empty allowlist blocks all calls. The test/inbound route implements that behavior. But both `/webhook/voice/stream` and `/webhook/voice` check:

```ts
if (config?.firewallEnabled && allowedNumbers.length > 0) {
  // reject a caller not matched in the list
}
```

With an empty list, this block is skipped and execution continues. The real webhook therefore does not match the UI/test policy. Matching also uses substring checks (`From.includes(num)` or `num.includes(From.slice(-10))`), rather than exact canonical phone identifiers.

Recommended contract:

1. Webhook signature validates transport origin; it does not prove the caller is the owner.
2. Resolve the called number to exactly one tenant/agent and server-held credential context.
3. Normalize the inbound number to a canonical representation and apply an exact-match caller policy.
4. An enabled allowlist with no entries denies calls unless an explicitly approved policy says otherwise.
5. An owner caller-ID match may choose a route but must not grant privileged agent/tool access without stronger identity verification.
6. Bind media streams to the accepted call/session and enforce duration, concurrency and spending caps.
7. Record the decision, rule/version, tenant, CallSid, outcome and reason; test actual webhook paths, not just simulations.

No calls were placed, numbers bought, accounts connected, permissions changed, or Twilio settings modified.

### Other trust-boundary gaps to resolve

- The main voice webhook paths have Twilio signature middleware. Shared middleware allows a development/explicit skip switch; production must reject that configuration. Subaccount signature/credential resolution requires focused validation.
- The telephony router declares sensitive account/number/call operations without route-level authentication middleware in the inspected file, and is mounted directly in routes.ts. Do not expose it based on UI access controls. The business-specific router has separate auth logic; that does not automatically protect the general router.
- The incoming SMS opt-in/out handler is mounted separately, and its comment delegates signature validation to upstream configuration; the mount inspected does not itself add that validator. Audit every webhook independently.
- Media-stream authentication was not proven by the connection callback alone; inspect the upgrade boundary and bind streams to authorized calls before reuse.

## Behavior controls: more complete than the first repo suggested

In `ai-biz-bot/ConciergePanel`, voice persona, DISC and ARCH settings have save requests to agent endpoints. The operational-mode UI includes no-drift controls and locked ARCH previews. `promptCompiler.ts` translates stored DISC and ARCH values into behavioral instructions and applies operational-mode/default overrides.

`server/routes/chatRoutes.ts` imports and invokes `validateArchEnvelope` for chat responses and includes validation results in response metadata. The validator checks handoff/next-step cues and certain SAFE-mode action claims. This is actual deterministic validation, unlike prompt-only enforcement in the voice-interface snapshot.

Limits:

- It does not validate the full Acknowledge/Reflect/Context/Handoff sequence.
- Its handoff heuristic accepts broad words such as “or”; this is not semantic proof of an effective next step.
- Voice Live is explicitly outside this validator's blocking boundary; do not claim chat/voice parity yet.
- “No drift” prompt text is a behavioral instruction, not a guarantee against model deviation.

Earlier `ai-chat` README describes personality/crisis/mirroring modules not present at those documented paths in its current tree. `backend/main.py` attempts optional mirroring imports and falls back to basic mode if unavailable. Treat that repository as a source of implemented pieces and ideas, not proof of the entire described behavioral architecture.

## Knowledge Library: preserve the model, fix access checks

The strongest candidate is the ai-biz-bot library: site-scoped artifacts, visibility, access keys, activation and content APIs, plus the KnowledgeManager panel. Additional source includes a knowledge certification snapshot/filter bridge for voice tool availability. Some bridge functions are explicitly future-use; source presence does not prove all live channels consume them.

Two concrete handler gaps:

- POST `/artifacts` checks that a site exists, then creates content without an ownership check in that handler.
- DELETE `/artifacts/:id` rejects a mismatch only when both artifact owner and caller identity are truthy. A missing caller skips that rejection branch. The inspected router mount provides no required-auth middleware for these paths.

Preserve public/private knowledge and agent activation concepts, but enforce actor/tenant permissions server-side for every operation. An access key or client-supplied session ID must not substitute for identity. Require source/version/provenance and a bounded per-turn retrieval record for HETIBANK evidence.

## Visualizers: retain both aesthetics and signal correctness

The main ai-biz-bot bars receive microphone/output-volume values from ConciergePanel; the input/output states are useful to preserve. The portable widget uses an AnalyserNode and supports three styles. However its “waveform” function receives frequency-domain bytes from `getByteFrequencyData`, not time-domain samples. Keep the style but repair the signal source before calling it a waveform.

The newer orbital visualizer is useful for system status and branding. Its random animation should not be presented as measured audio activity. Status animation, microphone level, and actual TTS playback level should be separate inputs to one visualizer interface.

The voice settings metrics collector currently inserts responseTime=0 and cutoffDetected=false. Consequently the displayed metrics are not evidence of actual response latency or cutoff performance. Health endpoint reads and profile rendering are real paths; monitoring needs real turn timestamps and audio events.

## Chat size and modality continuity

The newer shell has configurable overlay widths/min/max/padding and a shared content zone. The ai-biz-bot floating chat has responsive sizing; browser-chat's inspected ConversationView includes a vertically resizable text input. A complete drag-to-resize chat-window implementation has not been established in the files reviewed. Do not remove the requirement or claim it is absent from every branch/archive.

Browser-chat's hook keeps a single messages array when changing topic IDs; it does not load separate histories per thread. Its sample voice screen still offers “Simulate voice turn.” Reuse the continuity contract and selected helper logic after fixing persistence/isolation, not the sample as production voice integration.

Required switching invariant: session, actor, tenant, active intent, selected resource, plan, approvals, transcript and evidence remain consistent across chat/voice/canvas; in-flight actions execute once. Resizing must preserve scroll/focus and must not restart a voice session.

## Extraction architecture

| Package/module | Responsibility |
|---|---|
| clearvoice-ui | Shared primitives, menus, content/overlay frames, visualizers, sizing and theme adapter |
| clearvoice-session | Conversation, modality, transcript, intent/plan references, cancellation and reconnect |
| clearvoice-behavior | Versioned DISC/ARCH configuration, prompt compilation and observable output checks |
| clearvoice-audio | Microphone lifecycle, PTT/streaming interfaces, TTS adapters, playback and audio meters |
| clearvoice-knowledge | Artifact contracts, visibility, retrieval, activation, provenance and bounded context |
| clearvoice-telephony | Numbers, routing/firewall policy, Twilio adapter, stream binding, call/SMS lifecycle |
| Host adapter | Authentication, permissions, tools and product evidence; HETIBANK remains authoritative for mortgage data/calculations |

Do not merge the repositories wholesale. Extract one responsibility at a time, with source commit references and behavior tests. Keep telephony optional so installing the chat shell does not require a Twilio account or a desktop runtime.

## Acceptance sequence

1. **Inventory and provenance:** every adopted component names its source path/commit, dependencies, owner and supported runtime.
2. **Security boundaries:** fix the empty-list firewall and exact number matching; protect admin and knowledge mutations; bind tenant/call/stream identity.
3. **UI preservation:** approved component gallery for menu, chat sizes, voice picker, visualizer states, knowledge and telephony screens; keyboard and reduced-motion checks.
4. **Behavior consistency:** save/load DISC/ARCH; mode overrides; chat/voice parity tests; model output checks without forced repetitive questions.
5. **Session proof:** PTT, interruption, reconnect, provider fallback, resize, mode switch, one transcript and exactly-once execution.
6. **Telephony proof:** signature failures, denied caller, empty allowlist, owner verification, call limits, duplicate callbacks, stream replay, unknown tenant, provider outage, SMS preference enforcement. Use isolated test resources before any real call.
7. **Knowledge proof:** owner/non-owner/anonymous matrix, cross-tenant denials, activation, source provenance, retrieval bounds, removal/revocation behavior.
8. **Independent demo:** package works against a controlled host adapter before any HETIBANK V2 integration.

## Verification and limits

No code was changed in GitHub. No repository was merged/forked, no deployment or database changed, and no provider calls were made.

Five assertions ran against the exact retrieved ARCH validator using Node v24.22.1 experimental type transformation: sales missing handoff rejected, question handoff accepted, SAFE action claim rejected, low-handoff neutral response accepted, broad “or” cue accepted. Process exited 0. This checks the helper only, not the whole server/model pipeline.

The earlier 66 passing tests belong to the voice-interface review and do not certify these other repositories. No full npm builds, integration tests, live browser/audio/PSTN sessions, migration verification or complete credential/history scans were performed for this comparison. Simulated call histories and placeholder metrics were not accepted as evidence of working transport or performance.

## Principal source paths

- ai-biz-bot: `client/src/components/chat/ConciergePanel.tsx`, `client/src/components/voice/VoiceSelector.tsx`, `VoiceSettings.tsx`, `tools/KnowledgeManager.tsx`; `client/src/widgets/VoiceVisualizerWidget.tsx`, `ChatVoiceWidget.tsx`; `client/src/components/chat/VoiceVisualizerBars.tsx`.
- ai-biz-bot: `client/src/pages/developer/TelephonyManager.tsx`, `TwilioAccountManager.tsx`, `TelephonyPanel.tsx`; `server/routes/telephonyRoutes.ts`, `businessTelephonyRoutes.ts`, `twilioWebhooks.ts`; `server/middleware/twilioWebhookSignature.ts`; `server/twilio.ts`, `twilioSovereignStream.ts`.
- ai-biz-bot: `server/services/promptCompiler.ts`, `archEnvelopeValidator.ts`, `voiceKnowledgeBridge.ts`; `server/routes/chatRoutes.ts`, `knowledge-routes.ts`; `server/routes.ts`, `server/index.ts`, `shared/schema.ts`, `client/src/App.tsx`.
- ai-biz-bot: `client/src/services/voice/GeminiStreamingClient.ts`, `client/src/services/voiceTurnOrchestrator.ts`; telephony architecture/reliability docs and private/public library notes.
- browser-chat: `chat/useConversation.ts`, `ConversationView.tsx`, `arch/ModalitySwitcher.ts`, `CNSInterface.tsx`, `components/TelephonyPanel.tsx`.
- ai-chat: `backend/main.py`, `backend/core/gemini_service.py`, `components/TelephonyPanel.tsx`.
- twilio-telephony-voice-ai: `app-telco-twilio-admin/components/TelephonyPanel.tsx`, `CNSInterface.tsx`, `App.tsx`, `server/server.js`. Its inspected call simulation uses timers and randomly generated durations; its server supplies a Gemini proxy, not proof of the simulated PSTN control plane.
