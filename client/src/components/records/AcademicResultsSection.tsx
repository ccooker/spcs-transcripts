import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FORM_LEVELS, formLevelLabel } from '@/lib/formLevels';
import { RecordDeleteDialog } from './RecordDeleteDialog';
import { RecordSectionCard } from './RecordSectionCard';

// Client-side mirror of the server Zod schema PRESET_SUBJECTS
const PRESET_SUBJECTS = [
  'Chinese Language',
  'English Language',
  'Mathematics (Compulsory)',
  'Citizenship and Social Development (CSD)',
  'Chinese History',
  'History',
  'Geography',
  'Economics',
  'Ethics and Religious Studies',
  'Business, Accounting and Financial Studies (BAFS)',
  'Tourism and Hospitality Studies (THS)',
  'Information and Communication Technology (ICT)',
  'Design and Applied Technology (DAT)',
  'Technology and Living (TL)',
  'Biology',
  'Chemistry',
  'Physics',
  'Combined Science',
  'Mathematics Extended Module 1 (M1)',
  'Mathematics Extended Module 2 (M2)',
  'Music',
  'Visual Arts',
  'Chinese Literature',
  'English Literature',
  'Physical Education (PE)',
  'OTHER',
] as const;

type PresetSubject = (typeof PRESET_SUBJECTS)[number];

const currentYear = new Date().getFullYear();
const calendarYearOptions = Array.from({ length: 11 }, (_, i) => currentYear - i);

const academicResultFormSchema = z
  .object({
    subject: z.enum(PRESET_SUBJECTS),
    subjectOther: z.string().trim().min(1).max(100).optional(),
    grade: z.string().trim().min(1, 'Grade is required').max(20),
    calendarYear: z.number().int().min(2010).max(2040),
    formLevel: z.enum(FORM_LEVELS),
    notes: z.string().trim().max(200).optional(),
  })
  .refine(
    (data) =>
      data.subject !== 'OTHER' ||
      (data.subjectOther !== undefined && data.subjectOther.length > 0),
    { message: "Subject name is required when 'Other' is selected", path: ['subjectOther'] },
  );

type AcademicResultFormValues = z.infer<typeof academicResultFormSchema>;

type AcademicResult = {
  id: string;
  subject: string;
  subjectOther: string | null;
  grade: string;
  calendarYear: number;
  formLevel: string;
  notes: string | null;
};

interface AcademicResultsSectionProps {
  studentId: string;
}

const emptyDefaults: AcademicResultFormValues = {
  subject: 'Chinese Language',
  subjectOther: '',
  grade: '',
  calendarYear: currentYear,
  formLevel: 'FORM_4',
  notes: '',
};

export function AcademicResultsSection({ studentId }: AcademicResultsSectionProps) {
  const queryClient = useQueryClient();
  const queryKey = ['student', studentId, 'academics'] as const;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AcademicResult | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcademicResult | null>(null);

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => apiGet<AcademicResult[]>(`/students/${studentId}/academics`),
  });

  const createMutation = useMutation({
    mutationFn: (body: AcademicResultFormValues) =>
      apiPost<AcademicResult>(`/students/${studentId}/academics`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success('Academic result added');
      setDialogOpen(false);
    },
    onError: () => toast.error("Couldn't save changes. Please try again."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: AcademicResultFormValues }) =>
      apiPatch<AcademicResult>(`/students/${studentId}/academics/${id}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success('Academic result updated');
      setDialogOpen(false);
      setEditTarget(null);
    },
    onError: () => toast.error("Couldn't save changes. Please try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/students/${studentId}/academics/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success('Entry deleted');
      setDeleteTarget(null);
    },
    onError: () => toast.error("Couldn't delete entry. Please try again."),
  });

  const form = useForm<AcademicResultFormValues>({
    resolver: zodResolver(academicResultFormSchema),
    defaultValues: emptyDefaults,
  });

  const subjectValue = form.watch('subject') as PresetSubject;
  const showOtherInput = subjectValue === 'OTHER';

  function openAddDialog() {
    setEditTarget(null);
    form.reset(emptyDefaults);
    setDialogOpen(true);
  }

  function openEditDialog(result: AcademicResult) {
    setEditTarget(result);
    form.reset({
      subject: result.subject as PresetSubject,
      subjectOther: result.subjectOther ?? '',
      grade: result.grade,
      calendarYear: result.calendarYear,
      formLevel: result.formLevel as (typeof FORM_LEVELS)[number],
      notes: result.notes ?? '',
    });
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    if (!open) {
      setEditTarget(null);
      form.reset(emptyDefaults);
    }
    setDialogOpen(open);
  }

  function onSubmit(values: AcademicResultFormValues) {
    // Strip subjectOther when not applicable
    const body = {
      ...values,
      subjectOther: values.subject === 'OTHER' ? values.subjectOther : undefined,
    };
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, body });
    } else {
      createMutation.mutate(body);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEditing = Boolean(editTarget);

  function displaySubject(result: AcademicResult) {
    return result.subject === 'OTHER' ? (result.subjectOther ?? '') : result.subject;
  }

  return (
    <>
      <RecordSectionCard
        title="Academic results"
        count={data.length}
        addLabel="Add result"
        onAdd={openAddDialog}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        isEmpty={data.length === 0}
        emptyHeading="No academic results yet."
        emptyBody="Add results to track this student's academic performance."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Form</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((result) => (
              <TableRow key={result.id}>
                <TableCell>{displaySubject(result)}</TableCell>
                <TableCell>{result.grade}</TableCell>
                <TableCell>{result.calendarYear}</TableCell>
                <TableCell>{formLevelLabel(result.formLevel as (typeof FORM_LEVELS)[number])}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {result.notes ? result.notes.slice(0, 60) + (result.notes.length > 60 ? '…' : '') : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit"
                      onClick={() => openEditDialog(result)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      onClick={() => setDeleteTarget(result)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </RecordSectionCard>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit academic result' : 'Add academic result'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Subject */}
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Subject <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRESET_SUBJECTS.filter((s) => s !== 'OTHER').map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subject Other — shown when subject = OTHER */}
              {showOtherInput && (
                <FormField
                  control={form.control}
                  name="subjectOther"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Subject name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter subject name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Grade */}
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Grade <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. A, B+, 85%, Distinction"
                        maxLength={20}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Calendar Year */}
              <FormField
                control={form.control}
                name="calendarYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Calendar year <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(Number(v))}
                      value={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {calendarYearOptions.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Form Level */}
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
                        {FORM_LEVELS.map((fl) => (
                          <SelectItem key={fl} value={fl}>
                            {formLevelLabel(fl)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Optional — short note"
                        maxLength={200}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogOpenChange(false)}
                  disabled={isPending}
                >
                  Discard
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Saving…' : isEditing ? 'Save result' : 'Add result'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <RecordDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={async () => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
}
