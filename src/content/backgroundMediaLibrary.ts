export type BackgroundMediaKind = 'video' | 'image';

export type BackgroundMediaEntry = {
  id: string;
  label: string;
  description: string;
  kind: BackgroundMediaKind;
  path: string;
};

/**
 * Device-local background library for operator-installed media.
 * These paths stay outside governed repo content and are only used as optional shell assets.
 */
export const BACKGROUND_MEDIA_LIBRARY: BackgroundMediaEntry[] = [
  {
    id: 'circle-blue',
    label: 'Circle Blue',
    description: 'Compressed loop with a centered blue motion field for the voice shell.',
    kind: 'video',
    path: 'C:/Apps/ai_os_rust/assets/videos/0_Circle_Blue_4096x2160.mp4',
  },
  {
    id: 'anonymous-figure',
    label: 'Anonymous Figure',
    description: 'Compressed cinematic loop with a single operator-style subject silhouette.',
    kind: 'video',
    path: 'C:/Apps/ai_os_rust/assets/videos/0_Anonymous_Figure_3840x2160.mov',
  },
];
