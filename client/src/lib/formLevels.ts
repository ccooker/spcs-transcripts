export const FORM_LEVELS = [
  'FORM_1',
  'FORM_2',
  'FORM_3',
  'FORM_4',
  'FORM_5',
  'FORM_6',
] as const;

export type FormLevel = (typeof FORM_LEVELS)[number];

export function formLevelLabel(level: FormLevel): string {
  const map: Record<FormLevel, string> = {
    FORM_1: 'Form 1',
    FORM_2: 'Form 2',
    FORM_3: 'Form 3',
    FORM_4: 'Form 4',
    FORM_5: 'Form 5',
    FORM_6: 'Form 6',
  };
  return map[level];
}
