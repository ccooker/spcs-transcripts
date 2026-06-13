import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { UserInfo } from '@/App';
import { apiFetch, apiGet } from '@/api/apiClient';
import { AppShell } from '@/components/layout/AppShell';
import { RecordsUpdatedBanner } from '@/components/transcript/RecordsUpdatedBanner';
import { TipTapEditor } from '@/components/transcript/TipTapEditor';
import { TranscriptSectionCard } from '@/components/transcript/TranscriptSectionCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface TranscriptPageProps {
  userInfo: UserInfo | null;
}

type TranscriptStatus = 'NONE' | 'DRAFT' | 'FINALISED';

type TranscriptResponse = {
  autoPopulated: boolean;
  showRecordsBanner: boolean;
  status: TranscriptStatus;
  updatedAt: string | null;
  academicsContent: string | null;
  activitiesContent: string | null;
  awardsContent: string | null;
  workExperienceContent: string | null;
  careerGoalsContent: string | null;
  staffEndorsementContent: string | null;
  academicsVisible: boolean;
  activitiesVisible: boolean;
  awardsVisible: boolean;
  workExperienceVisible: boolean;
  careerGoalsVisible: boolean;
  staffEndorsementVisible: boolean;
};

type StudentSummary = {
  id: string;
  fullName: string;
};

type SaveIndicator = 'saved' | 'saving' | 'error';

type SectionConfig = {
  id: string;
  title: string;
  contentKey: keyof Pick<
    TranscriptResponse,
    | 'academicsContent'
    | 'activitiesContent'
    | 'awardsContent'
    | 'workExperienceContent'
    | 'careerGoalsContent'
    | 'staffEndorsementContent'
  >;
  visibleKey: keyof Pick<
    TranscriptResponse,
    | 'academicsVisible'
    | 'activitiesVisible'
    | 'awardsVisible'
    | 'workExperienceVisible'
    | 'careerGoalsVisible'
    | 'staffEndorsementVisible'
  >;
  placeholder?: string;
  minHeightClass?: string;
};

const SECTIONS: SectionConfig[] = [
  { id: 'academics', title: 'Academics', contentKey: 'academicsContent', visibleKey: 'academicsVisible' },
  { id: 'activities', title: 'Activities', contentKey: 'activitiesContent', visibleKey: 'activitiesVisible' },
  { id: 'awards', title: 'Awards', contentKey: 'awardsContent', visibleKey: 'awardsVisible' },
  {
    id: 'work-experience',
    title: 'Work experience',
    contentKey: 'workExperienceContent',
    visibleKey: 'workExperienceVisible',
  },
  {
    id: 'career-goals',
    title: 'Career goals',
    contentKey: 'careerGoalsContent',
    visibleKey: 'careerGoalsVisible',
  },
  {
    id: 'staff-endorsement',
    title: 'Staff endorsement',
    contentKey: 'staffEndorsementContent',
    visibleKey: 'staffEndorsementVisible',
    placeholder: 'Write your personal endorsement of this student…',
    minHeightClass: 'min-h-[200px]',
  },
];

function apiPutTranscript(studentId: string, body: Record<string, unknown>) {
  return apiFetch(`/students/${studentId}/transcript`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function TranscriptPage({ userInfo }: TranscriptPageProps) {
  const { id: studentId } = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [transcript, setTranscript] = useState<TranscriptResponse | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState<SaveIndicator>('saved');
  const inFlightSaves = useRef(0);
  const [exporting, setExporting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const retryRef = useRef<(() => void) | null>(null);

  const loadPage = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setNotFound(false);
    try {
      const [studentData, transcriptData] = await Promise.all([
        apiGet<StudentSummary>(`/students/${studentId}`),
        apiGet<TranscriptResponse>(`/students/${studentId}/transcript`),
      ]);
      setStudent(studentData);
      setTranscript(transcriptData);
      setBannerDismissed(false);
      setSaveIndicator('saved');
      setEditorKey((key) => key + 1);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 404) {
        setNotFound(true);
        setStudent(null);
        setTranscript(null);
      } else {
        toast.error("Couldn't load transcript. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const beginSave = useCallback(() => {
    inFlightSaves.current += 1;
    setSaveIndicator('saving');
  }, []);

  const endSave = useCallback((success: boolean, retry?: () => void) => {
    inFlightSaves.current = Math.max(0, inFlightSaves.current - 1);
    if (inFlightSaves.current === 0) {
      setSaveIndicator(success ? 'saved' : 'error');
    }
    retryRef.current = success ? null : retry ?? null;
  }, []);

  const savePartial = useCallback(
    async (body: Record<string, unknown>, retry?: () => void) => {
      if (!studentId) return;
      beginSave();
      try {
        const res = await apiPutTranscript(studentId, body);
        if (!res.ok) {
          throw new Error('Save failed');
        }
        const updated = (await res.json()) as TranscriptResponse & { status?: TranscriptStatus };
        setTranscript((prev) =>
          prev
            ? {
                ...prev,
                ...body,
                status: updated.status ?? prev.status,
                updatedAt: updated.updatedAt ?? prev.updatedAt,
              }
            : prev,
        );
        endSave(true);
      } catch {
        endSave(false, retry ?? (() => void savePartial(body)));
        toast.error('Could not save changes. Please try again.');
      }
    },
    [studentId, beginSave, endSave],
  );

  const handleSectionSave = useCallback(
    (contentKey: SectionConfig['contentKey'], html: string) => {
      void savePartial({ [contentKey]: html }, () => {
        void savePartial({ [contentKey]: html });
      });
    },
    [savePartial],
  );

  const handleToggleVisible = useCallback(
    (visibleKey: SectionConfig['visibleKey'], visible: boolean) => {
      setTranscript((prev) => (prev ? { ...prev, [visibleKey]: visible } : prev));
      void savePartial({ [visibleKey]: visible });
    },
    [savePartial],
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      if (value !== 'DRAFT' && value !== 'FINALISED') return;
      setTranscript((prev) => (prev ? { ...prev, status: value } : prev));
      void savePartial({ status: value });
    },
    [savePartial],
  );

  const handleRegenerate = useCallback(async () => {
    if (!studentId) return;
    setIsRegenerating(true);
    beginSave();
    try {
      const res = await apiPutTranscript(studentId, { regenerate: true });
      if (!res.ok) {
        throw new Error('Regenerate failed');
      }
      const transcriptData = await apiGet<TranscriptResponse>(
        `/students/${studentId}/transcript`,
      );
      setTranscript(transcriptData);
      setBannerDismissed(true);
      setEditorKey((key) => key + 1);
      setSaveIndicator('saved');
      toast.success('Draft regenerated');
    } catch {
      setSaveIndicator('error');
      toast.error("Couldn't regenerate draft. Please try again.");
    } finally {
      inFlightSaves.current = 0;
      setIsRegenerating(false);
    }
  }, [studentId, beginSave]);

  const handleExport = useCallback(async () => {
    if (!studentId || !student) return;
    setExporting(true);
    try {
      const res = await apiFetch(`/students/${studentId}/transcript/export`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error('Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcript-${student.fullName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [studentId, student]);

  const handleRetrySave = useCallback(() => {
    if (retryRef.current) {
      retryRef.current();
    }
  }, []);

  const statusValue =
    transcript?.status === 'FINALISED' ? 'FINALISED' : 'DRAFT';

  const showBanner =
    Boolean(transcript?.showRecordsBanner) && !bannerDismissed && !loading;

  return (
    <AppShell userInfo={userInfo} activeNav="students">
      <div key={studentId}>
        {student && (
          <Link
            to={`/students/${studentId}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {student.fullName}
          </Link>
        )}

        {loading && (
          <div className="space-y-6" aria-busy="true">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="min-h-[160px] w-full" />
            <Skeleton className="min-h-[160px] w-full" />
          </div>
        )}

        {!loading && notFound && (
          <Alert variant="destructive">
            <AlertTitle>Student not found</AlertTitle>
            <AlertDescription>
              This student may have been removed or the link is incorrect.{' '}
              <Link to="/students" className="underline">
                Back to students
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {!loading && student && transcript && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <h1 className="text-2xl font-semibold leading-tight">
                {student.fullName} — Transcript
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <span aria-live="polite" className="text-sm">
                  {saveIndicator === 'saving' && (
                    <span className="text-muted-foreground">Saving…</span>
                  )}
                  {saveIndicator === 'saved' && (
                    <span className="text-muted-foreground">All changes saved</span>
                  )}
                  {saveIndicator === 'error' && (
                    <button
                      type="button"
                      className="text-destructive underline"
                      onClick={handleRetrySave}
                    >
                      Save failed — retry?
                    </button>
                  )}
                </span>
                <Select value={statusValue} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[140px]" aria-label="Transcript status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="FINALISED">Finalised</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  disabled={exporting}
                  aria-disabled={exporting}
                  onClick={() => void handleExport()}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exporting ? 'Exporting…' : 'Export PDF'}
                </Button>
              </div>
            </div>

            {showBanner && (
              <RecordsUpdatedBanner
                onDismiss={() => setBannerDismissed(true)}
                onRegenerate={() => void handleRegenerate()}
                isRegenerating={isRegenerating}
              />
            )}

            <div className="flex flex-col gap-8">
              {SECTIONS.map((section) => (
                <TranscriptSectionCard
                  key={section.id}
                  sectionId={section.id}
                  title={section.title}
                  visible={transcript[section.visibleKey]}
                  onToggleVisible={(visible) =>
                    handleToggleVisible(section.visibleKey, visible)
                  }
                  isLoading={false}
                >
                  <TipTapEditor
                    key={`${section.id}-${editorKey}`}
                    initialHtml={transcript[section.contentKey] ?? ''}
                    ariaLabel={`${section.title} narrative`}
                    toolbarLabel={`${section.title} text formatting`}
                    placeholder={section.placeholder}
                    minHeightClass={section.minHeightClass}
                    onSave={(html) => handleSectionSave(section.contentKey, html)}
                  />
                </TranscriptSectionCard>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
