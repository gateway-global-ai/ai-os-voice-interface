import type { ShortcutTrigger, EducationalLesson } from './KnowledgeBaseSchema';
import { KNOWLEDGE_BASE_SEED } from './SeedData';

export class KnowledgeRetrievalService {
  /**
   * Accepts an array of shortcut triggers and returns the mapped EducationalLesson records.
   */
  public async getLessonsForShortcuts(triggers: ShortcutTrigger[]): Promise<EducationalLesson[]> {
    // In a real app, this would query a database.
    // Here we filter our seed data.
    return KNOWLEDGE_BASE_SEED.filter(lesson => triggers.includes(lesson.trigger));
  }
}

export const knowledgeRetrievalService = new KnowledgeRetrievalService();
