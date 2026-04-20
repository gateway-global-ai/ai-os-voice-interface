export type SystemPhilosophy = 
  | 'Separation of Powers'
  | 'Dynamic State Management'
  | 'Deterministic Infrastructure'
  | 'Error Visibility & Recovery';

export type ShortcutTrigger = 
  | 'ui_fragility'
  | 'mock_data_hallucinations'
  | 'repeated_code'
  | 'suppressed_exceptions';

export interface EducationalLesson {
  id: string;
  philosophy: SystemPhilosophy;
  trigger: ShortcutTrigger;
  title: string;
  compassionate_explanation: string;
  technical_breakdown: string;
  code_example: {
    bad: string;
    good: string;
  };
}
