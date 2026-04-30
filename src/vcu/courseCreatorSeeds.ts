/**
 * Stable identifiers and paths for Course Creator seed rows.
 * The intro knowledge base is the research report in-repo (imported by seed-supabase).
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

/** Deterministic id for the first-course draft (upserted by scripts/seed-supabase.ts). */
export const INTRO_VIBE_CODING_DRAFT_ID = '6f7a8a6e-0c0d-4d4e-8f0a-10ff01abface';

/** Relative to repository root. */
export const INTRO_VIBE_CODING_KNOWLEDGE_REL_PATH =
  'docs/knowledge_base/research_studies/Deep Dive_ Vibe Coding Research Report.md';

/** Relative to repository root. Source infographic uploaded with the research bundle. */
export const INTRO_VIBE_CODING_INFOGRAPHIC_REL_PATH =
  'user_uploads/vibe_coding_research/infographic.html';

/** Relative to repository root. Source podcast uploaded with the research bundle. */
export const INTRO_VIBE_CODING_PODCAST_REL_PATH =
  'user_uploads/vibe_coding_research/Vibe coding and the flow debt tradeoff.mp3';

export const INTRO_VIBE_CODING_WORKING_TITLE = 'Introduction to Vibe Coding';

/** Deterministic id for the Wardley Mapping body-of-knowledge draft. */
export const WARDLEY_BOK_DRAFT_ID = '2c8f2b0a-7610-4f11-9b6b-8a1f0c4e5d77';

/** Relative to repository root. */
export const WARDLEY_BOK_KNOWLEDGE_REL_PATH =
  'docs/knowledge_base/research_studies/wardley_mapping_bok_part_1.md';

export const WARDLEY_BOK_NOTEBOOK_URL =
  'https://colab.research.google.com/github/tractorjuice/Building_BoK/blob/main/Building_Wardley_Mapping_Body_of_Knowledge_Part_1.ipynb/';

export const WARDLEY_BOK_RAW_NOTEBOOK_URL =
  'https://raw.githubusercontent.com/tractorjuice/Building_BoK/main/Building_Wardley_Mapping_Body_of_Knowledge_Part_1.ipynb';

export const WARDLEY_BOK_PINECONE_RUST_URL =
  'https://github.com/pinecone-io/pinecone-rust-client';

export const WARDLEY_BOK_WORKING_TITLE = 'Wardley Mapping Body of Knowledge';
