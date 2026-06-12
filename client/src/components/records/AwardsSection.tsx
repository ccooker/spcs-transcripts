import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { formatMonthYear } from '@/lib/periodFormat';
import { MonthYearPicker } from './MonthYearPicker';
import { RecordDeleteDialog } from './RecordDeleteDialog';
import { RecordSectionCard } from './RecordSectionCard';

const AWARD_LEVELS = ['SCHOOL', 'REGIONAL', 'STATE', 'NATIONAL', 'INTERNATIONAL'] as const;
type AwardLevel = (typeof AWARD_LEVELS)[number];

const AWARD_LEVEL_LABELS: Record<AwardLevel, string> = {
  SCHOOL: 'School',
  REGIONAL: 'Regional',
  STATE: 'State',
  NATIONAL: 'National',
  INTERNATIONAL: 'International',
};

function awardLevelBadge(level: AwardLevel): { variant: 'secondary' | 'outline' | 'default'; className?: string } {
  switch (level) {
    case 'SCHOOL':
      return { variant: 'secondary' };
    case 'REGIONAL':
      return { variant: 'outline' };
    case 'STATE':
      return { variant: 'default' };
    case 'NATIONAL':
      return { variant: 'default' };
    case 'INTERNATIONAL':
      return { variant: 'default', className: 'font-semibold' };
  }
}

const monthSchema = z.number().int().min(1).max(12);
const yearSchema = z.number().int().min(2000).max(2040);

const awardFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  issuer: z.string().trim().min(1, 'Issuer is required').max(200),
  awardMonth: monthSchema,
  awardYear: yearSchema,
  level: z.enum(AWARD_LEVELS),
  description: z.string().trim().max(500).optional(),
});

type AwardFormValues = z.infer<typeof awardFormSchema>;

type Award = {
  id: string;
  title: string;
  issuer: string;
  awardMonth: number;
  awardYear: number;
  level: AwardLevel;
  description: string | null;
};

interface AwardsSectionProps {
  studentId: string;
}

const currentYear = new Date().getFullYear();

const emptyDefaults: AwardFormValues = {
  title: '',
  issuer: '',
  awardMonth: new Date().getMonth() + 1,
  awardYear: currentYear,
  level: 'SCHOOL',
  description: '',
};

export function AwardsSection({ studentId }: AwardsSectionProps) {
  const queryClient = useQueryClient();
  const queryKey = ['student', studentId, 'awards'] as const;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Award | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Award | null>(null);

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => apiGet<Award[]>(`/students/${studentId}/awards`),
  });

  const createMutation = useMutation({
    mutationFn: (body: AwardFormValues) =>
      apiPost<Award>(`/students/${studentId}/awards`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success('Award added');
      setDialogOpen(false);
    },
    onError: () => toast.error("Couldn't save changes. Please try again."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: AwardFormValues }) =>
      apiPatch<Award>(`/students/${studentId}/awards/${id}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success('Award updated');
      setDialogOpen(false);
      setEditTarget(null);
    },
    onError: () => toast.error("Couldn't save changes. Please try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/students/${studentId}/awards/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success('Entry deleted');
      setDeleteTarget(null);
    },
    onError: () => toast.error("Couldn't delete entry. Please try again."),
  });

  const form = useForm<AwardFormValues>({
    resolver: zodResolver(awardFormSchema),
    defaultValues: emptyDefaults,
  });

  const awardMonthValue = form.watch('awardMonth');
  const awardYearValue = form.watch('awardYear');

  function openAddDialog() {
    setEditTarget(null);
    form.reset(emptyDefaults);
    setDialogOpen(true);
  }

  function openEditDialog(award: Award) {
    setEditTarget(award);
    form.reset({
      title: award.title,
      issuer: award.issuer,
      awardMonth: award.awardMonth,
      awardYear: award.awardYear,
      level: award.level,
      description: award.description ?? '',
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

  function onSubmit(values: AwardFormValues) {
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, body: values });
    } else {
      createMutation.mutate(values);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEditing = Boolean(editTarget);

  return (
    <>
      <RecordSectionCard
        title="Awards"
        count={data.length}
        addLabel="Add award"
        onAdd={openAddDialog}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        isEmpty={data.length === 0}
        emptyHeading="No awards yet."
        emptyBody="Add awards and achievements to recognise this student's accomplishments."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Issuer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((award) => {
              const badgeProps = awardLevelBadge(award.level);
              return (
                <TableRow key={award.id}>
                  <TableCell>{award.title}</TableCell>
                  <TableCell>{award.issuer}</TableCell>
                  <TableCell>{formatMonthYear(award.awardMonth, award.awardYear)}</TableCell>
                  <TableCell>
                    <Badge variant={badgeProps.variant} className={badgeProps.className}>
                      {AWARD_LEVEL_LABELS[award.level]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit"
                        onClick={() => openEditDialog(award)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete"
                        onClick={() => setDeleteTarget(award)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </RecordSectionCard>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit award' : 'Add award'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Title <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. First Prize in Science Competition" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Issuer */}
              <FormField
                control={form.control}
                name="issuer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Issuer <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Hong Kong Science Museum" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Award date */}
              <MonthYearPicker
                label="Award date"
                required
                monthValue={awardMonthValue}
                yearValue={awardYearValue}
                onMonthChange={(v) => form.setValue('awardMonth', v ?? 1)}
                onYearChange={(v) => form.setValue('awardYear', v ?? currentYear)}
              />
              {form.formState.errors.awardMonth && (
                <p className="text-sm text-destructive">{form.formState.errors.awardMonth.message}</p>
              )}
              {form.formState.errors.awardYear && (
                <p className="text-sm text-destructive">{form.formState.errors.awardYear.message}</p>
              )}

              {/* Level */}
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Level <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AWARD_LEVELS.map((l) => (
                          <SelectItem key={l} value={l}>
                            {AWARD_LEVEL_LABELS[l]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description — plain HTML textarea (shadcn Textarea installed in Plan 03-03b) */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <textarea
                        className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Brief description"
                        maxLength={500}
                        {...field}
                        value={field.value ?? ''}
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
                  {isPending ? 'Saving…' : isEditing ? 'Save award' : 'Add award'}
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
