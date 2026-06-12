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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatPeriod } from '@/lib/periodFormat';
import { MonthYearPicker } from './MonthYearPicker';
import { RecordDeleteDialog } from './RecordDeleteDialog';
import { RecordSectionCard } from './RecordSectionCard';

const monthSchema = z.number().int().min(1).max(12);
const yearSchema = z.number().int().min(2000).max(2040);

const activityFormSchema = z.object({
  organisation: z.string().trim().min(1, 'Organisation is required').max(200),
  role: z.string().trim().min(1, 'Role is required').max(200),
  description: z.string().trim().max(500).optional(),
  startMonth: monthSchema,
  startYear: yearSchema,
  endMonth: monthSchema.nullable().optional(),
  endYear: yearSchema.nullable().optional(),
});

type ActivityFormValues = z.infer<typeof activityFormSchema>;

type Activity = {
  id: string;
  organisation: string;
  role: string;
  description: string | null;
  startMonth: number;
  startYear: number;
  endMonth: number | null;
  endYear: number | null;
};

interface ActivitiesSectionProps {
  studentId: string;
}

const currentYear = new Date().getFullYear();

const emptyDefaults: ActivityFormValues = {
  organisation: '',
  role: '',
  description: '',
  startMonth: new Date().getMonth() + 1,
  startYear: currentYear,
  endMonth: null,
  endYear: null,
};

export function ActivitiesSection({ studentId }: ActivitiesSectionProps) {
  const queryClient = useQueryClient();
  const queryKey = ['student', studentId, 'activities'] as const;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Activity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);
  const [ongoing, setOngoing] = useState(false);

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => apiGet<Activity[]>(`/students/${studentId}/activities`),
  });

  const createMutation = useMutation({
    mutationFn: (body: ActivityFormValues) =>
      apiPost<Activity>(`/students/${studentId}/activities`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success('Activity added');
      setDialogOpen(false);
    },
    onError: () => toast.error("Couldn't save changes. Please try again."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: ActivityFormValues }) =>
      apiPatch<Activity>(`/students/${studentId}/activities/${id}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success('Activity updated');
      setDialogOpen(false);
      setEditTarget(null);
    },
    onError: () => toast.error("Couldn't save changes. Please try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/students/${studentId}/activities/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success('Entry deleted');
      setDeleteTarget(null);
    },
    onError: () => toast.error("Couldn't delete entry. Please try again."),
  });

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: emptyDefaults,
  });

  function openAddDialog() {
    setEditTarget(null);
    setOngoing(false);
    form.reset(emptyDefaults);
    setDialogOpen(true);
  }

  function openEditDialog(activity: Activity) {
    setEditTarget(activity);
    const isOngoing = activity.endMonth == null && activity.endYear == null;
    setOngoing(isOngoing);
    form.reset({
      organisation: activity.organisation,
      role: activity.role,
      description: activity.description ?? '',
      startMonth: activity.startMonth,
      startYear: activity.startYear,
      endMonth: activity.endMonth,
      endYear: activity.endYear,
    });
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    if (!open) {
      setEditTarget(null);
      setOngoing(false);
      form.reset(emptyDefaults);
    }
    setDialogOpen(open);
  }

  function handleOngoingChange(checked: boolean) {
    setOngoing(checked);
    if (checked) {
      form.setValue('endMonth', null);
      form.setValue('endYear', null);
    }
  }

  function onSubmit(values: ActivityFormValues) {
    const body: ActivityFormValues = {
      ...values,
      endMonth: ongoing ? null : values.endMonth,
      endYear: ongoing ? null : values.endYear,
    };
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, body });
    } else {
      createMutation.mutate(body);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEditing = Boolean(editTarget);

  const endMonthValue = form.watch('endMonth');
  const endYearValue = form.watch('endYear');
  const startMonthValue = form.watch('startMonth');
  const startYearValue = form.watch('startYear');

  return (
    <>
      <RecordSectionCard
        title="Activities"
        count={data.length}
        addLabel="Add activity"
        onAdd={openAddDialog}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        isEmpty={data.length === 0}
        emptyHeading="No activities yet."
        emptyBody="Add extracurricular activities to build this student's profile."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organisation</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell>{activity.organisation}</TableCell>
                <TableCell>{activity.role}</TableCell>
                <TableCell>
                  {formatPeriod(
                    activity.startMonth,
                    activity.startYear,
                    activity.endMonth,
                    activity.endYear,
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit"
                      onClick={() => openEditDialog(activity)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      onClick={() => setDeleteTarget(activity)}
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
              {isEditing ? 'Edit activity' : 'Add activity'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Organisation */}
              <FormField
                control={form.control}
                name="organisation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Organisation <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. SPCS Drama Society" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Role */}
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Role <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. President, Member" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of involvement"
                        maxLength={500}
                        className="min-h-[80px]"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start Date */}
              <MonthYearPicker
                label="Start date"
                required
                monthValue={startMonthValue}
                yearValue={startYearValue}
                onMonthChange={(v) => form.setValue('startMonth', v ?? 1)}
                onYearChange={(v) => form.setValue('startYear', v ?? currentYear)}
              />
              {form.formState.errors.startMonth && (
                <p className="text-sm text-destructive">{form.formState.errors.startMonth.message}</p>
              )}
              {form.formState.errors.startYear && (
                <p className="text-sm text-destructive">{form.formState.errors.startYear.message}</p>
              )}

              {/* End Date + Ongoing checkbox */}
              <div className="space-y-2">
                <MonthYearPicker
                  label="End date"
                  monthValue={ongoing ? null : endMonthValue}
                  yearValue={ongoing ? null : endYearValue}
                  onMonthChange={(v) => form.setValue('endMonth', v)}
                  onYearChange={(v) => form.setValue('endYear', v)}
                  disabled={ongoing}
                />
                <p className="text-xs text-muted-foreground">Leave blank if ongoing</p>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ongoing"
                    checked={ongoing}
                    onChange={(e) => handleOngoingChange(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  <Label htmlFor="ongoing" className="text-sm font-normal cursor-pointer">
                    Ongoing / Present
                  </Label>
                </div>
              </div>

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
                  {isPending ? 'Saving…' : isEditing ? 'Save activity' : 'Add activity'}
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
