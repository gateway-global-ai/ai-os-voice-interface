/**
 * Course Creator blueprint — assembles the VCU "book + audio + voice + assets + capstone" model.
 * Persisted in `university_course_drafts.blueprint` (JSONB). Promote to canonical
 * `university_courses` / `university_lessons` only after the no-mock review pipeline.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type BookChapter = { title: string; content: string };
export type MediaChapter = { title: string; content: string };
export type ExampleItem = { label: string; body: string };
export type FileAsset = { label: string; uri: string; notes: string };
export type UrlAsset = { label: string; url: string; notes: string };
export type IdeIntegration = { label: string; notes: string };

export type CourseCreatorBlueprint = {
  introduction: { tableOfContents: string };
  lesson: {
    book: { chapters: BookChapter[] };
    audio: { chapters: MediaChapter[] };
    voice: { chapters: MediaChapter[] };
  };
  examples: ExampleItem[];
  interactiveExperiment: { instructions: string };
  assets: {
    fileLibrary: FileAsset[];
    externalUrls: UrlAsset[];
    ideIntegrations: IdeIntegration[];
  };
  lessonDiscussion: { prompt: string; notes: string };
  capstone: {
    summary: string;
    skillsToApply: string;
    verificationSteps: string;
    marketplaceNotes: string;
  };
};

export type CourseGuidance = {
  courseName: string;
  chapterTitles: string[];
  capstoneSummary: string;
  tableOfContents: string;
};

export function defaultCourseGuidance(): CourseGuidance {
  return {
    courseName: '',
    chapterTitles: [],
    capstoneSummary: '',
    tableOfContents: '',
  };
}

export function defaultCourseBlueprint(): CourseCreatorBlueprint {
  return {
    introduction: { tableOfContents: '' },
    lesson: {
      book: { chapters: [] },
      audio: { chapters: [] },
      voice: { chapters: [] },
    },
    examples: [],
    interactiveExperiment: { instructions: '' },
    assets: { fileLibrary: [], externalUrls: [], ideIntegrations: [] },
    lessonDiscussion: { prompt: '', notes: '' },
    capstone: {
      summary: '',
      skillsToApply: '',
      verificationSteps: '',
      marketplaceNotes: '',
    },
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function parseCourseBlueprintJson(raw: unknown): CourseCreatorBlueprint {
  if (!isRecord(raw)) return defaultCourseBlueprint();
  const intro = isRecord(raw.introduction) && typeof raw.introduction.tableOfContents === 'string'
    ? { tableOfContents: raw.introduction.tableOfContents }
    : { tableOfContents: '' };

  const lesson = isRecord(raw.lesson) ? raw.lesson : {};
  const lBook = isRecord(lesson.book) ? lesson.book : {};
  const lAudio = isRecord(lesson.audio) ? lesson.audio : {};
  const lVoice = isRecord(lesson.voice) ? lesson.voice : {};
  const bookChapters = Array.isArray(lBook.chapters) ? lBook.chapters : [];
  const audioChapters = Array.isArray(lAudio.chapters) ? lAudio.chapters : [];
  const voiceChapters = Array.isArray(lVoice.chapters) ? lVoice.chapters : [];
  const parseMedia = (a: unknown[]): BookChapter[] =>
    a
      .filter((x) => isRecord(x) && typeof x.title === 'string' && (typeof (x as { content?: string }).content === 'string' || (x as { content?: string }).content === undefined))
      .map((x) => ({
        title: (x as { title: string }).title,
        content: typeof (x as { content?: string }).content === 'string' ? (x as { content: string }).content : '',
      }));

  const examples = Array.isArray(raw.examples) ? raw.examples : [];
  const exParsed: ExampleItem[] = examples
    .filter((x) => isRecord(x) && typeof (x as { label?: string }).label === 'string')
    .map((x) => ({
      label: (x as { label: string }).label,
      body: typeof (x as { body?: string }).body === 'string' ? (x as { body: string }).body : '',
    }));

  const ie = isRecord(raw.interactiveExperiment) && typeof (raw.interactiveExperiment as { instructions?: string }).instructions === 'string'
    ? (raw.interactiveExperiment as { instructions: string })
    : { instructions: '' };

  const assets = isRecord(raw.assets) ? raw.assets : {};
  const fl = Array.isArray(assets.fileLibrary) ? assets.fileLibrary : [];
  const eu = Array.isArray(assets.externalUrls) ? assets.externalUrls : [];
  const ide = Array.isArray(assets.ideIntegrations) ? assets.ideIntegrations : [];
  const ld = isRecord(raw.lessonDiscussion) ? raw.lessonDiscussion : { prompt: '', notes: '' };
  const cap = isRecord(raw.capstone) ? raw.capstone : {};

  return {
    introduction: intro,
    lesson: {
      book: { chapters: parseMedia(bookChapters as unknown[]) },
      audio: { chapters: parseMedia(audioChapters as unknown[]) },
      voice: { chapters: parseMedia(voiceChapters as unknown[]) },
    },
    examples: exParsed,
    interactiveExperiment: { instructions: ie.instructions || '' },
    assets: {
      fileLibrary: fl
        .filter((x) => isRecord(x) && typeof (x as { label?: string }).label === 'string')
        .map((x) => ({
          label: (x as { label: string }).label,
          uri: typeof (x as { uri?: string }).uri === 'string' ? (x as { uri: string }).uri : '',
          notes: typeof (x as { notes?: string }).notes === 'string' ? (x as { notes: string }).notes : '',
        })),
      externalUrls: eu
        .filter((x) => isRecord(x) && typeof (x as { label?: string }).label === 'string')
        .map((x) => ({
          label: (x as { label: string }).label,
          url: typeof (x as { url?: string }).url === 'string' ? (x as { url: string }).url : '',
          notes: typeof (x as { notes?: string }).notes === 'string' ? (x as { notes: string }).notes : '',
        })),
      ideIntegrations: ide
        .filter((x) => isRecord(x) && typeof (x as { label?: string }).label === 'string')
        .map((x) => ({
          label: (x as { label: string }).label,
          notes: typeof (x as { notes?: string }).notes === 'string' ? (x as { notes: string }).notes : '',
        })),
    },
    lessonDiscussion: {
      prompt: typeof (ld as { prompt?: string }).prompt === 'string' ? (ld as { prompt: string }).prompt : '',
      notes: typeof (ld as { notes?: string }).notes === 'string' ? (ld as { notes: string }).notes : '',
    },
    capstone: {
      summary: typeof (cap as { summary?: string }).summary === 'string' ? (cap as { summary: string }).summary : '',
      skillsToApply: typeof (cap as { skillsToApply?: string }).skillsToApply === 'string' ? (cap as { skillsToApply: string }).skillsToApply : '',
      verificationSteps: typeof (cap as { verificationSteps?: string }).verificationSteps === 'string' ? (cap as { verificationSteps: string }).verificationSteps : '',
      marketplaceNotes: typeof (cap as { marketplaceNotes?: string }).marketplaceNotes === 'string' ? (cap as { marketplaceNotes: string }).marketplaceNotes : '',
    },
  };
}

export function parseCourseGuidanceJson(raw: unknown): CourseGuidance {
  if (!isRecord(raw)) return defaultCourseGuidance();
  return {
    courseName: typeof raw.courseName === 'string' ? raw.courseName : '',
    chapterTitles: Array.isArray(raw.chapterTitles) ? raw.chapterTitles.filter((s): s is string => typeof s === 'string') : [],
    capstoneSummary: typeof raw.capstoneSummary === 'string' ? raw.capstoneSummary : '',
    tableOfContents: typeof raw.tableOfContents === 'string' ? raw.tableOfContents : '',
  };
}
