import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPost } from '@/api/apiClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { CareerInterestsChecklist, CAREER_INTEREST_LABELS } from './CareerInterestsChecklist';
import { RecordSectionCard } from './RecordSectionCard';

type CareerGoalVersion = {
  id: string;
  interests: string[];
  description: string | null;
  author: { displayName: string };
  createdAt: string;
};

const CAREER_INTEREST_KEYS = Object.keys(CAREER_INTEREST_LABELS);

const careerGoalFormSchema = z.object({
  interests: z.array(z.enum(CAREER_INTEREST_KEYS as [string, ...string[]])).min(1, 'Select at least one interest'),
  description: z.string().trim().max(500).optional(),
});

type CareerGoalFormValues = z.infer<typeof careerGoalFormSchema>;

function formatGoalDate(createdAt: string): string {
  return new Date(createdAt).toLocaleString('en-HK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface CareerGoalsSectionProps {
  studentId: string;
}

export function CareerGoalsSection({ studentId }: CareerGoalsSectionProps) {
  const queryClient = useQueryClient();
  const queryKey = ['student', studentId, 'career-goals'] as const;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => apiGet<CareerGoalVersion[]>(`/students/${studentId}/career-goals`),
  });

  const createMutation = useMutation({
    mutationFn: (body: CareerGoalFormValues) =>
      apiPost<CareerGoalVersion>(`/students/${studentId}/career-goals`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success('Career goals saved');
      setDialogOpen(false);
    },
    onError: () => toast.error("Couldn't save changes. Please try again."),
  });

  const form = useForm<CareerGoalFormValues>({
    resolver: zodResolver(careerGoalFormSchema),
    defaultValues: { interests: [], description: '' },
  });

  const descriptionValue = form.watch('description') ?? '';

  const versions = data;
  const current = versions[0];
  const history = versions.slice(1);

  function openUpdateDialog() {
    form.reset({
      interests: current?.interests ?? [],
      description: current?.description ?? '',
    });
    setDialogOpen(true);
  }

  function onSubmit(values: CareerGoalFormValues) {
    createMutation.mutate(values);
  }

  return (
    <>
      <RecordSectionCard
        title="Career goals"
        count={versions.length}
        addLabel="Update career goals"
        onAdd={openUpdateDialog}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        isEmpty={versions.length === 0}
        emptyHeading="No career goals recorded yet."
        emptyBody="Add the first entry to begin building this student's career profile."
      >
        {current && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Interests</p>
              <div className="flex flex-wrap gap-2">
                {current.interests.map((interest) => (
                  <Badge key={interest} variant="secondary" className="mr-1 mb-1">
                    {CAREER_INTEREST_LABELS[interest] ?? interest}
                  </Badge>
                ))}
              </div>
            </div>

            {current.description && (
              <div>
                <p className="text-sm font-medium mb-1">Goals &amp; description</p>
                <p className="text-sm leading-relaxed">{current.description}</p>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Updated {formatGoalDate(current.createdAt)} by {current.author.displayName}
            </p>

            {history.length > 0 && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHistoryExpanded((prev) => !prev)}
                  className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight
                    className={`h-4 w-4 mr-1 transition-transform ${historyExpanded ? 'rotate-90' : ''}`}
                  />
                  {historyExpanded
                    ? 'Hide version history'
                    : `Version history (${history.length} previous)`}
                </Button>

                {historyExpanded && (
                  <div className="mt-3 space-y-2">
                    {history.map((version) => (
                      <div key={version.id} className="bg-muted/30 rounded p-3">
                        <p className="text-xs text-muted-foreground mb-2">
                          {formatGoalDate(version.createdAt)} · {version.author.displayName}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-1">
                          {version.interests.map((interest) => (
                            <Badge key={interest} variant="secondary" className="text-xs">
                              {CAREER_INTEREST_LABELS[interest] ?? interest}
                            </Badge>
                          ))}
                        </div>
                        {version.description && (
                          <p className="text-sm leading-relaxed mt-1 text-muted-foreground">
                            {version.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </RecordSectionCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update career goals</DialogTitle>
            <DialogDescription className="sr-only">
              Update this student's career goals and interests below.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="interests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Career interests <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <CareerInterestsChecklist
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goals &amp; description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe this student's goals, university targets, or career aspirations"
                        maxLength={500}
                        className="min-h-[120px]"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground text-right">
                      {descriptionValue.length}/500
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={createMutation.isPending}
                >
                  Discard
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving…' : 'Save career goals'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
