# ClearVoice — AI Voice Interface review

Review date: October 26, 2026 (Pacific)

**Decision:** Preserve this work as a reusable interface and governance foundation. Extract selected modules into a separate ClearVoice package after hardening. Do not embed the entire AI OS application in HETIBANK. Keep HETIBANK V1 focused on ChatGPT; website voice remains V2.

## Evidence boundary

Reviewed `gateway-global-ai/ai-os-voice-interface`, main snapshot `92c2783a3df3fbca4cb7250dc43daff70825face`. Retrieved its complete recursive tree (770 entries) and 513 selected text files, including source, server handlers, migrations, registries, tests, and governance. Selection excluded archive content, lockfile, large artifacts, and most binaries; this is not a complete history or secret audit. The working source copy was assembled through GitHub reads, not a git clone.

Compared two governance documents against `gateway-global-ai/aios-governing-docs` at `c09b2dff65617ffbbc6fc03dc85b55c920fccaa1`. No live app, database, provider account, deployment, or existing browser window was exercised. No repository or website changes, migrations, credential rotation, commits, pushes, or deployments occurred.

## 1. Findings ranked by consequence

| Priority | Finding | Evidence and implication |
|---|---|---|
| Critical before public exposure | Operator token issuance does not prove caller identity | `server/operatorSessionServe.ts` accepts a body phone, checks whether that phone belongs to an operator, and issues a token without validating an authenticated session or OTP proof. `prodHost.ts` mounts this handler without authentication middleware. An operator's phone number is an identifier, not proof of ownership. Impact depends on configured operator lookup and route exposure. |
| High | Privileged routes trust the resulting token | `courseCreatorServe.ts`, `adminKnowledgebaseServe.ts`, and `checkmeSaasAdminServe.ts` use `verifyOperatorToken`. The token issuance gap can therefore cross into service-role data operations and admin proxy access. No live exploit attempted. |
| High | Browser credential exposure remains possible | `vite.config.ts` explicitly defines OpenAI, DeepSeek, and Twilio credential substitutions and copies server-style `123CHECKME_KEY` into `VITE_123CHECKME_KEY`. Browser sources reference these values in `src/api/llmHealth.ts`, `src/onboarding/ScreenInvite.tsx`, and `src/core/io/checkmeClient.ts`. Configured values can enter built JS. Gemini's server gateway is an improvement, but it does not close these other paths. |
| High | Model gateway lacks an application access/cost boundary in this host | `prodHost.ts` exposes Gemini generate/TTS/stream and local-model chat without authentication or rate limiting in the reviewed host. `geminiServe.ts` accepts caller-provided system instruction, model, and token settings. External reverse-proxy controls are unverified. A public deployment could allow provider consumption outside intended UI policy. |
| High | Desktop model output can invoke filesystem commands | `App.tsx` around lines 1491–1525 parses model-produced JSON and invokes `read_file` / `list_directory`. Rust handlers in `src-tauri/src/commands.rs` accept caller paths; read size is capped but no approved root/scope check is present there. This contradicts the kernel foundation's prohibition on direct model-initiated tool execution. Confine capabilities at the Rust boundary, not only in prompts. |
| High, deployment-dependent | Migration RLS coverage is incomplete | Across seven migration files, 48 distinct public tables are declared; 14 have no matching ENABLE ROW LEVEL SECURITY statement in these files. Includes users, sessions, preferences, plans, grounding context, outcomes, and session knowledge. This is a migration-source finding, not proof of live database exposure; verify grants and live policies before reuse. |
| Medium | Execution envelope protections are optional at the client control plane | `integrationControlPlane.ts` validates execution scope only if supplied; defaults surface mode to founder. It does not itself enforce proposal approval or return early for a proposal-only execution mode before dispatch. Some UI flows supply plans and approval, but the dispatcher must enforce the invariant independently. Remote MCP authorization is outside this review. |
| Medium | Audit evidence is ephemeral | `shellCanvasAudit.ts` maintains a 200-event in-memory buffer, with console output in development. Refresh/restart loses this channel. It is useful diagnostics, not a durable transaction audit. |
| Medium | Governance copies have drifted | Embedded SPEC-009 is draft 0.5.1; canonical is ratified 0.5.7. Embedded SPEC-010 is draft 1.0.4; canonical is draft 1.0.5. These are confirmed differences in main, not hypothetical. |
| Medium | Some review capabilities are simulated | `TriangulationReviewService.ts` fabricates timed provider responses; `ProbabilityScoringEngine.ts` starts from a simulated 0.85. They cannot serve as evidence of real peer reviews or measured success probability. Reachability of every scaffold in current UI was not established. |
| Medium | Reusable component standards have multiple styling authorities | Shell rules require CSS custom properties, while Sovereign wrappers use `config/brand.ts`, which contains fixed dark/cyan classes. Preserve component contracts and consolidate their token source before HETIBANK theming. |

`operatorAuthority.ts` also contains a fixed development signing-secret fallback. Production should fail closed without a dedicated signing secret. Its 12-hour token does not recheck role revocation at each verification.

## 2. Architecture cartography

| Layer | Implemented assets | ClearVoice treatment |
|---|---|---|
| Shell and presentation | React 19, Vite, shared header/command rail, voice/chat content zone, overlays, themes | Extract the reusable shell; keep the website's domain UI outside it |
| Critical UI components | Eight Sovereign primitives; PTT; status/identity; disclosure; content and overlay frames | Preserve contracts, loading/disabled behavior, sizing, theme tokens, and layer standards |
| Input/output | Browser speech recognition, Gemini TTS/gateway, Rust Whisper, Voicebox client/sidecar | Adapter interfaces are valuable; browser and desktop need separate distributions |
| Intent/navigation | Structured INTENT_JSON parser, deterministic shell commands, navigation apply path, intent registry | Reuse routing and deny behavior with a stable product contract |
| Execution policy | Plan evaluation, scope builders/validation, resource keys, skill authority | Reuse after moving enforceable authority to server/host boundaries |
| Workspace integration | Intent-to-MCP mapping, single control plane, OAuth token/session support | Useful adapter pattern; Google Workspace itself is outside HETIBANK V1 scope |
| Desktop kernel | Tauri/Rust, SQLite state, mastery scoring, intent loop, voice commands | Optional desktop extension; do not make website embedding depend on Rust |
| Cloud data | Supabase menus, skills, university, projects, billing access mirrors | Separate registry concepts from unrelated application tables |
| Product expansion | Vibe Coding University, community, coding agents, course creator, podcasts, SaaS admin | Keep out of the minimal ClearVoice embed |

Observed Workspace adapter calls outside its definition occur only in `integrationControlPlane.ts` when excluding tests. That is a useful existing architectural discipline.

`App.tsx` is 3,704 lines and coordinates substantial product behavior. It is a working integration surface, not yet an independently consumable SDK.

## 3. ShadCN and multimodal component system

Jason identified this as a major prior investment. It should be preserved deliberately.

The catalog contains **77 component entries plus 12 hero block entries, 89 merged entries**. These counts describe catalog metadata; they do not prove that 89 components are installed or approved implementations. The catalog's own README distinguishes shadcn.io from official shadcn/ui and calls it design-time discovery.

`SHADCN_MCP_PLANE_BOUNDARY_V1.md` explicitly states that production voice does not fetch arbitrary catalog components per turn. Its intended runtime uses approved, registered surfaces and typed payloads. Several linked contracts/packages referenced by that document are absent from this tree, so its description must not be treated as proof that the whole contract system is present.

| Critical element | Existing standard / implementation | Preserve and verify |
|---|---|---|
| Button | `SovereignButton`: variants, default button type, loading disables interaction, motion | Semantic contract; keyboard and reduced-motion behavior |
| Card | `SovereignCard`: spacing, surface, animation, overrides | Container contract; token source and overflow handling |
| Text and forms | Title, paragraph, description, grid, text input, radio group | Hierarchy, labels, focus, validation, accessible names |
| PTT | `VoicePttButton`: press/release, pointer cancellation, lost capture, idle/busy/listening state; already branded CLEAR VOICE AI | Recording lifecycle; keyboard equivalent and mobile interaction require proof |
| Voice/chat body | `ShellContentZone`: shared messages, transcript rendering, voice center stage, chrome spacing | Session and task continuity across modes |
| Overlay | `ShellOverlayFrame`: width/padding tokens, backdrop behavior, footer clearance, system-controls z-layer | Stacking, dismissal, focus trapping, focus return, Escape behavior |
| Navigation | `shellNavigationApply`: shared actions for voice, chat, agent intents, UI | One transition path; test interruption and in-flight execution |
| Theme | `useShellTheme`, `index.css`, shell rules; Sovereign BRAND tokens | One theme adapter supporting HETIBANK without per-component overrides |

**Recommended multimodal acceptance matrix:** voice → chat → canvas → voice must retain session ID, transcript, active intent, selected property/resource, execution plan, approval state, and evidence sources. Switching modes must not duplicate a tool call or clear an approval, and must stop or hand off audio predictably. Test each with keyboard, pointer, cancellation, loading, error, and reconnect states.

Existing `shellNavigationApply`, router, and authority tests support the control-path foundation. They do not prove the complete browser/audio continuity matrix. The repository's sole retrieved e2e spec is a shell-mount and z-token smoke check, not an end-to-end multimodal workflow proof.

## 4. Routes and trust boundaries

| Host / route family | Observed behavior | Trust boundary |
|---|---|---|
| POST `/api/send-otp`, `/api/verify-otp` | Forward to 123CheckMe; verification path may add operator information | External OTP service plus local issuance logic |
| POST `/api/operator-session` | Restore/issue operator token using submitted phone | Missing ownership proof in reviewed handler |
| `/__course_creator_api/*` | Draft/access operations with Supabase admin client | Operator token |
| `/__admin_knowledgebase_api/*` | Knowledgebase admin operations | Operator token |
| `/__checkme_saas_admin_api/*` | SaaS admin proxy | Operator token |
| GET `/api/local-model/readiness`; POST `/api/local-model/chat` | Ollama readiness and chat | No host-level caller authorization observed |
| GET `/api/gemini/readiness`, `/health`; POST `/generate`, `/tts`, `/tts/stream` | Server-held Gemini credential; text/audio generation | No host-level caller authorization observed |
| GET/POST `/__podcast_library_api/episodes` | List/write files under public podcast library | No authorization in prodHost route; user input can produce public artifacts |
| `/mcp/core`, `/__workspace_mcp`, generic `/api` proxies | Vite development proxy configuration | Not equivalent to production routing |
| MCP pilot and sandbox | Separate server scripts and iframe bundle | Must deploy/configure independently if retained |
| Tauri commands | Local state, speech, model calls, files, sidecar interaction | Desktop host permissions; separate from web routes |

The production host is not route-equivalent to Vite. In particular, development proxy routes do not automatically exist in `npm start`; absent infrastructure must not be mistaken for an available deployed capability.

## 5. Schema map

Seven Supabase migrations declare 48 distinct public tables:

- Identity/session/preferences and session knowledge.
- Intents, skills, actions, outcomes, grounding, plans, tools, and relationships.
- Shell menus/items and UI levels.
- Knowledgebase, podcast episodes, referrals.
- University courses/lessons/artifacts, agent skills, SDK registry, projects/tasks.
- Program access, enrollments, Stripe mirrors, plugin packages.
- External skill sources/categories/rules, dependencies, deployment phases, Cursor registries.
- Native skill protocols/deployment evidence; skillshub protocols/taps/allowed tools/permission profiles/authority evidence.
- Course drafts.

The 14 tables without explicit RLS enablement in these migrations are: actions, grounding_context, intent_skills, intent_tools, intents, outcomes, podcast_episodes, session_knowledge_inputs, shell_preferences, shell_sessions, skills, ui_levels, user_plans, users.

SQLite separately implements active state, aptitude, knowledge graph, roles, journey phases, intent/smart-contract records, shell menu/settings/identity records, and conversation history. `AIOS_KERNEL_FOUNDATION.md` says there are no conversational memory tables, while `state_machine/migrations.rs` creates `conversation_history`: another confirmed documentation/runtime mismatch.

No migrations were applied and no live schema was queried.

## 6. Governance correction plan

1. Pin canonical governing document IDs and commit versions in a dependency manifest; make embedded copies explicit snapshots.
2. Update the product's draft SPEC-009 reference to the ratified canonical document, then map implementation tests to clauses.
3. Reconcile local-first/single-user kernel prose with the current cloud-assisted browser product and persisted conversations.
4. Replace stale README references: it points at `src/governance/*`, whereas the current tree uses `src/shellCanvas/*`; it also describes parent-folder env loading, while Vite sets project-root envDir.
5. Validate links to packages and canonical surface contracts before declaring those systems implemented.
6. Retain the component standards and multimodal behavior contracts as separately versioned assets.

## 7. Staged ClearVoice extraction plan

| Stage | Measurable completion condition |
|---|---|
| A. Close exposure paths | Operator identity validated server-side; missing signing secret fails closed; no long-lived credentials in frontend build; model routes authenticated and budget-limited; filesystem capability rooted and approved |
| B. Freeze interface contracts | Versioned component inventory, one token source, explicit voice/chat/canvas transition contract, approved surface IDs and typed payloads |
| C. Extract minimal package | Separate shell, UI primitives, navigation, voice adapters, transport interface, and server policy contract; no university/billing/admin dependencies in embed |
| D. Prove multimodal behavior | Acceptance matrix passes without lost state, duplicate execution, unintended recording, or approval bypass; accessibility checks and screenshots document each critical state |
| E. HETIBANK adapter, V2 | Tools call HETIBANK APIs/MCP with existing role/workspace/evidence rules; loan calculations remain authoritative in HETIBANK; isolated demo before integration |

A separate ClearVoice branch/package can preserve provenance without coupling this review to the active HETIBANK website work. No fork, branch, issue, or package was created during this review.

## 8. Verification performed

Environment: isolated review workspace, Node v24.22.1. Existing TS unit tests ran via Node's experimental type transformation and a temporary extension-resolution loader, without installing repository dependencies or calling external services.

- Five test files: scope engine, mail search rows, contact parser, Workspace intent router, shell state commands — **42 passed, 0 failed**.
- Three test files: shell navigation application, shell intent router, interim shell authority — **24 passed, 0 failed**.
- Bootstrap test attempted but could not load because `@supabase/supabase-js` is not installed in this review workspace. This is an environment block, not a demonstrated assertion failure.
- Full npm test/typecheck/build, Rust build/tests, browser/audio e2e, deployment checks, database grants/RLS, and provider readiness: **unverified**.
- Common provider-key/private-key signature scan of selected current text files returned no matches. This does not establish absence of secrets in unselected files, archives, bundles, other branches, or git history, nor does it establish that previously exposed credentials were revoked.
- No-mock gate: report findings and test results are real; simulated repository review/probability modules are identified explicitly and not accepted as verification.

Exact passing commands (from the review workspace):

```bash
node --experimental-transform-types --loader ./review-loader.mjs --test review-source/src/scope/scopeEngine.test.ts review-source/src/workspace/mailSearchRows.test.ts review-source/src/workspace/contactsMcpParse.test.ts review-source/src/workspace/workspaceIntentRouter.test.ts review-source/src/shell/shellStateCommands.test.ts
node --experimental-transform-types --loader ./review-loader.mjs --test review-source/src/shell/shellNavigationApply.test.ts review-source/src/shell/shellIntentRouter.test.ts review-source/src/shell/shellAuthority.test.ts
```

Both test processes exited 0. Test output retained locally in `review-tests.log` and `review-switching-verified.log`. A mixed attempt including bootstrap exited nonzero because of the missing package; its log is `review-switching-tests.log`.

## Source links

All voice-interface links below pin the reviewed main snapshot:

- [Repository snapshot](https://github.com/gateway-global-ai/ai-os-voice-interface/tree/92c2783a3df3fbca4cb7250dc43daff70825face)
- [Operator session](https://github.com/gateway-global-ai/ai-os-voice-interface/blob/92c2783a3df3fbca4cb7250dc43daff70825face/server/operatorSessionServe.ts)
- [Operator authority](https://github.com/gateway-global-ai/ai-os-voice-interface/blob/92c2783a3df3fbca4cb7250dc43daff70825face/server/operatorAuthority.ts)
- [Build configuration](https://github.com/gateway-global-ai/ai-os-voice-interface/blob/92c2783a3df3fbca4cb7250dc43daff70825face/vite.config.ts)
- [Production host](https://github.com/gateway-global-ai/ai-os-voice-interface/blob/92c2783a3df3fbca4cb7250dc43daff70825face/server/prodHost.ts)
- [Sovereign UI primitives](https://github.com/gateway-global-ai/ai-os-voice-interface/tree/92c2783a3df3fbca4cb7250dc43daff70825face/src/ui-core)
- [Shell navigation](https://github.com/gateway-global-ai/ai-os-voice-interface/blob/92c2783a3df3fbca4cb7250dc43daff70825face/src/shell/shellNavigationApply.ts)
- [ShadCN boundary](https://github.com/gateway-global-ai/ai-os-voice-interface/blob/92c2783a3df3fbca4cb7250dc43daff70825face/docs-governance/canonical/SHADCN_MCP_PLANE_BOUNDARY_V1.md)
- [Canonical SPEC-009](https://github.com/gateway-global-ai/aios-governing-docs/blob/c09b2dff65617ffbbc6fc03dc85b55c920fccaa1/specifications/IntentPrimitiveAndExecutionModel.md)
- [Canonical SPEC-010](https://github.com/gateway-global-ai/aios-governing-docs/blob/c09b2dff65617ffbbc6fc03dc85b55c920fccaa1/specifications/ExecutionScopeAndContextBounding.md)
