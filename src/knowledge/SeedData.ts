import type { EducationalLesson } from './KnowledgeBaseSchema';

export const KNOWLEDGE_BASE_SEED: EducationalLesson[] = [
  {
    id: 'lesson_suppressed_exceptions',
    philosophy: 'Error Visibility & Recovery',
    trigger: 'suppressed_exceptions',
    title: 'Why Empty Catch Blocks are Dangerous',
    compassionate_explanation: 'AI agents sometimes write empty catch blocks to prevent the app from crashing during tests. While this feels like a quick fix, it hides real errors from you. If a database save fails, the app will silently ignore it, leading to lost user data and impossible-to-find bugs.',
    technical_breakdown: 'When an exception is caught and ignored, the execution flow continues as if nothing went wrong, but the system state is likely corrupted. Proper error handling requires logging the error and informing the user or fallback system.',
    code_example: {
      bad: 'try {\n  await saveUser(data);\n} catch (e) {\n  // AI shortcut: do nothing\n}',
      good: 'try {\n  await saveUser(data);\n} catch (e) {\n  logger.error("Failed to save user", e);\n  notifyUser("Save failed. Please try again.");\n}'
    }
  },
  {
    id: 'lesson_mock_data',
    philosophy: 'Dynamic State Management',
    trigger: 'mock_data_hallucinations',
    title: 'The Illusion of Mock Data',
    compassionate_explanation: 'To make the UI look finished quickly, AI will often hardcode JSON arrays directly into your components. This means your app isn\'t actually talking to a backend. We need to replace these hallucinations with real API calls so your app is truly functional.',
    technical_breakdown: 'Hardcoded data prevents your application from reflecting real-world state changes. By abstracting data fetching into services or hooks, your UI components remain pure and can react to dynamic data from your database.',
    code_example: {
      bad: 'const users = [{ id: 1, name: "Alice" }];\nreturn <div>{users[0].name}</div>;',
      good: 'const { users, loading } = useUsers();\nif (loading) return <Spinner />;\nreturn <div>{users[0].name}</div>;'
    }
  },
  {
    id: 'lesson_ui_fragility',
    philosophy: 'Separation of Powers',
    trigger: 'ui_fragility',
    title: 'Understanding UI Fragility',
    compassionate_explanation: 'Inline CSS and hardcoded pixel values make your app look good on one specific screen but break on mobile devices. Using a unified design system ensures your app is responsive and maintainable.',
    technical_breakdown: 'When styles are hardcoded inline, they cannot be easily overridden by media queries or themes. A design system uses tokenized CSS classes or variables, ensuring consistency and responsiveness across the entire application.',
    code_example: {
      bad: '<div style={{ marginTop: "43px", color: "#333" }}>Hello</div>',
      good: '<div className="mt-8 text-slate-800">Hello</div>'
    }
  },
  {
    id: 'lesson_repeated_code',
    philosophy: 'Deterministic Infrastructure',
    trigger: 'repeated_code',
    title: 'Abstracting Repeated Logic',
    compassionate_explanation: 'Copying and pasting code is a common AI shortcut to get things working fast. However, if you need to fix a bug, you have to find and fix it in every copied location. Abstracting this logic saves you time and headaches.',
    technical_breakdown: 'The DRY (Don\'t Repeat Yourself) principle reduces technical debt. By extracting duplicated logic into shared utility functions or custom hooks, you create a single source of truth that is easier to test and maintain.',
    code_example: {
      bad: '// In File A\nconst formattedDate = new Intl.DateTimeFormat("en-US").format(date);\n// In File B\nconst formattedDate = new Intl.DateTimeFormat("en-US").format(date);',
      good: '// In utils/date.ts\nexport const formatDate = (date: Date) => new Intl.DateTimeFormat("en-US").format(date);\n// In File A & B\nconst formattedDate = formatDate(date);'
    }
  }
];
