import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export const CAREER_INTEREST_LABELS: Record<string, string> = {
  MEDICINE_HEALTH: 'Medicine / Health',
  LAW: 'Law',
  ENGINEERING: 'Engineering',
  BUSINESS_FINANCE: 'Business / Finance',
  EDUCATION: 'Education',
  ARTS_DESIGN: 'Arts / Design',
  SCIENCE_RESEARCH: 'Science / Research',
  IT_TECHNOLOGY: 'IT / Technology',
  HOSPITALITY: 'Hospitality',
  SOCIAL_SERVICES: 'Social Services',
  SPORTS: 'Sports',
  UNDECIDED: 'Undecided / Exploring',
};

const CAREER_INTEREST_KEYS = Object.keys(CAREER_INTEREST_LABELS);

interface CareerInterestsChecklistProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function CareerInterestsChecklist({ value, onChange }: CareerInterestsChecklistProps) {
  return (
    <fieldset className="border-0 p-0 m-0">
      <legend className="sr-only">Career interests</legend>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CAREER_INTEREST_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-2 min-h-[44px]">
            <Checkbox
              id={key}
              checked={value.includes(key)}
              onCheckedChange={(checked) =>
                onChange(
                  checked ? [...value, key] : value.filter((v) => v !== key),
                )
              }
            />
            <Label htmlFor={key} className="font-normal cursor-pointer">
              {CAREER_INTEREST_LABELS[key]}
            </Label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
