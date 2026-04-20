---
name: podcast-episode-packaging
description: Package podcast episodes into the AI OS library with consistent metadata, transcript linkage, cover-art prompts, and library updates. Use when adding podcast episodes, mp3 or wav narration files, transcripts, podcast covers, or research-audio library items.
---

# Podcast Episode Packaging

## Purpose

Use this skill when the user adds a narrated episode and wants it prepared for the AI OS podcast library.

The workflow should produce:

1. normalized episode metadata
2. transcript linkage
3. a consistent cover-art prompt
4. optional generated cover image
5. a library entry update

## Default Location

For this project, treat `src/content/podcastEpisodes.ts` as the primary episode registry unless the user asks for a different source.

## Inputs

Gather or infer:

- audio file path
- transcript path
- episode title
- runtime if known
- series name
- short summary

If any of those are missing, derive what you can from the transcript and ask only for what cannot be safely inferred.

## Workflow

### 1. Read the transcript first

Before writing metadata or prompts:

- read the transcript or source article
- identify the thesis, stakes, audience, and tone
- extract 3 to 5 thematic anchors

Do not generate generic cover prompts without reading the content.

### 2. Normalize episode metadata

Create or update the episode record with:

- `id`: kebab-case slug
- `title`
- `durationLabel`
- `summary`
- `sourcePath`
- `transcriptPath`
- `series`
- `coverImagePath` when available
- `coverPrompt`

Keep summaries to 1 sentence by default. Prefer signal over hype.

### 3. Use the AI OS visual theme

Podcast artwork should stay within the AI OS visual system:

- dark navy or black base
- cyan, electric blue, and restrained emerald glow
- glass or atmospheric depth
- abstract systems imagery over stock-photo realism
- high contrast and legible silhouette
- minimal clutter

Avoid:

- photoreal faces unless the user explicitly wants them
- busy collage layouts
- random icons without thematic meaning
- warm orange/red poster aesthetics that break the shell theme

### 4. Generate the cover-art prompt

Use the template in [episode-meta-prompt.md](episode-meta-prompt.md).

The prompt should include:

- subject
- symbolic visual metaphor tied to the episode thesis
- composition
- palette
- style constraints
- "no clutter / no stock-photo look" constraints

### 5. Generate image when requested

If the user explicitly wants cover art generated, call `GenerateImage` with:

- a square cover composition
- the episode-specific prompt
- a filename like `podcast-<slug>-cover.png`

### 6. Update the library surface

After metadata is ready:

- update `src/content/podcastEpisodes.ts`
- ensure the library surface renders the new entry cleanly
- include transcript linkage when available

## Output Template

Use this structure when drafting episode metadata for review:

```ts
{
  id: 'episode-slug',
  title: 'Episode Title',
  durationLabel: '6:26',
  summary: 'One-sentence summary.',
  sourcePath: 'C:/path/to/audio.mp3',
  transcriptPath: 'C:/path/to/transcript.md',
  series: 'AI OS Research Audio',
  coverImagePath: 'optional-generated-cover.png',
  coverPrompt: 'Square podcast cover ...'
}
```

## Quality Bar

- The cover prompt must clearly reflect the episode's actual thesis.
- The metadata should be retrieval-friendly, not marketing fluff.
- The library entry should stay visually consistent with the shell.
