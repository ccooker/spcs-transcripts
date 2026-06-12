import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FORM_LEVELS, formLevelLabel } from '@/lib/formLevels';

const currentYear = new Date().getFullYear();
const GRADUATION_YEAR_MIN = 2020;
const GRADUATION_YEAR_MAX = 2040;
const graduationYearOptions = Array.from(
  { length: GRADUATION_YEAR_MAX - GRADUATION_YEAR_MIN + 1 },
  (_, i) => GRADUATION_YEAR_MIN + i,
);

export const createStudentFormSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(200),
  formLevel: z.enum(FORM_LEVELS),
  graduationYear: z.number().int().min(2020).max(2040),
  schoolStudentId: z.string().trim().min(1, 'School student ID is required').max(50),
  studentEmail: z.email('Invalid email').optional().or(z.literal('')),
  studentPhone: z.string().max(30).optional(),
  parentEmail: z.email('Invalid email').optional().or(z.literal('')),
  parentPhone: z.string().max(30).optional(),
});

export type CreateStudentFormValues = z.infer<typeof createStudentFormSchema>;

const emptyDefaults: CreateStudentFormValues = {
  fullName: '',
  formLevel: 'FORM_4',
  graduationYear: currentYear + 1,
  schoolStudentId: '',
  studentEmail: '',
  studentPhone: '',
  parentEmail: '',
  parentPhone: '',
};

interface StudentFormProps {
  onSubmit: (values: CreateStudentFormValues) => Promise<void>;
  isSubmitting?: boolean;
  schoolStudentIdError?: string | null;
  defaultValues?: CreateStudentFormValues;
  mode?: 'create' | 'edit';
}

export function StudentForm({
  onSubmit,
  isSubmitting = false,
  schoolStudentIdError,
  defaultValues,
  mode = 'create',
}: StudentFormProps) {
  const form = useForm<CreateStudentFormValues>({
    resolver: zodResolver(createStudentFormSchema),
    defaultValues: defaultValues ?? emptyDefaults,
  });

  useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" id="student-form">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-xl font-semibold leading-tight">Profile</h2>

          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Full name <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Student full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="formLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Form level <span className="text-destructive">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select form level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FORM_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {formLevelLabel(level)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="graduationYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Graduation year <span className="text-destructive">*</span>
                </FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={String(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select graduation year" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {graduationYearOptions.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        Class of {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {mode === 'create' ? (
            <FormField
              control={form.control}
              name="schoolStudentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    School student ID <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. S2024001" {...field} />
                  </FormControl>
                  <FormMessage />
                  {schoolStudentIdError && (
                    <p className="text-sm font-medium text-destructive">{schoolStudentIdError}</p>
                  )}
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="schoolStudentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School student ID</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly className="bg-muted" />
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          <Separator className="my-4" />
          <p className="text-sm text-muted-foreground">Contact details (optional)</p>

          <FormField
            control={form.control}
            name="studentEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Student email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="student@school.edu" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="studentPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Student phone</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="Phone number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="parentEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent/guardian email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="parent@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="parentPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent/guardian phone</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="Phone number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <input type="submit" className="hidden" disabled={isSubmitting} />
      </form>
    </Form>
  );
}
