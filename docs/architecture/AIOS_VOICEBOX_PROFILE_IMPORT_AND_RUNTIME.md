# AIOS Voice Box Profile Import and Runtime

## Purpose

This note explains how the AI OS Voice Box surface installs local voice archives, activates profiles, and feeds the existing lesson, podcast, and shell narration paths.

This is product-facing runtime guidance. Governed authority for the voice lanes and header control model lives in the AIOS standards repository.

## What a Voice Box archive contains

The supported local archive is a `.voicebox.zip` package containing:

- `manifest.json`
- `samples.json`
- one or more WAV files under `samples/`

The importer uses that archive to recreate a local Voice Box profile inside the desktop runtime.

## Import flow

The Voice Box surface now supports archive-first installation:

1. choose or paste a local `.voicebox.zip` path
2. install the archive into the local Voice Box runtime
3. review the installed profile in the profile list
4. activate that profile for Voice Box playback

The desktop runtime import command does not upload the archive to a cloud service. It recreates the profile locally by creating a Voice Box profile and re-registering each archived sample with its reference text.

## Runtime surfaces

The active implementation surfaces are:

- `src/components/shell/VoiceBoxPanel.tsx`
- `src/components/shell/VoiceControlPanel.tsx`
- `src/core/io/VoiceboxClient.ts`
- `src-tauri/src/voicebox.rs`
- `src-tauri/src/commands.rs`
- `src/App.tsx`

## How profile activation works

Voice Box profile selection still flows through the shell-owned voice route model:

- the operator opens the deeper Voice Box surface from the governed voice control plane
- the operator activates a local profile
- `App.tsx` sets that profile as the active Voice Box identity
- spoken output uses that profile whenever the Voice Box route is selected

This keeps profile identity aligned with the existing route selector rather than inventing a second hidden speech state.

## Relationship to lessons and podcasts

Imported or recorded Voice Box profiles are intended for:

- shell narration
- lesson narration
- podcast and research-audio rendering

Operationally, the same local profile can be reused anywhere the app routes spoken output through the Voice Box path. This makes the imported operator voice a reusable local narration asset rather than a one-off onboarding setting.

## Local-first boundary

Voice Box remains a local operator-side voice path:

- profile archives come from local disk
- profile installation happens in the desktop runtime
- profile samples stay in the local Voice Box environment
- the feature is intended to work without remote TTS APIs

That keeps personalized narration compatible with the broader sovereign/local voice posture.
