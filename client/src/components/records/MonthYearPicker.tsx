import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - i);

interface MonthYearPickerProps {
  label: string;
  monthValue?: number | null;
  yearValue?: number | null;
  onMonthChange: (v: number | null) => void;
  onYearChange: (v: number | null) => void;
  required?: boolean;
  disabled?: boolean;
}

export function MonthYearPicker({
  label,
  monthValue,
  yearValue,
  onMonthChange,
  onYearChange,
  required = false,
  disabled = false,
}: MonthYearPickerProps) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium leading-none">
        {label}
        {required && <span aria-hidden> *</span>}
      </legend>
      <div className="flex gap-2">
        <Select
          value={monthValue?.toString() ?? ''}
          onValueChange={(v) => onMonthChange(v ? Number(v) : null)}
          disabled={disabled}
        >
          <SelectTrigger className="w-24" aria-label="Month">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value.toString()}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={yearValue?.toString() ?? ''}
          onValueChange={(v) => onYearChange(v ? Number(v) : null)}
          disabled={disabled}
        >
          <SelectTrigger className="w-24" aria-label="Year">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </fieldset>
  );
}
