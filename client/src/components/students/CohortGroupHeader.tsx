import { TableCell, TableRow } from '@/components/ui/table';
import { formLevelLabel, type FormLevel } from '@/lib/formLevels';

type TranscriptStatus = 'NONE' | 'DRAFT' | 'FINALISED';

export type CohortCounts = {
  draft: number;
  finalised: number;
  none: number;
};

export function countCohortStatus(
  students: { formLevel: FormLevel; transcriptStatus: TranscriptStatus }[],
  formLevel: FormLevel,
): CohortCounts {
  const inForm = students.filter((s) => s.formLevel === formLevel);
  return {
    draft: inForm.filter((s) => s.transcriptStatus === 'DRAFT').length,
    finalised: inForm.filter((s) => s.transcriptStatus === 'FINALISED').length,
    none: inForm.filter((s) => s.transcriptStatus === 'NONE').length,
  };
}

interface CohortGroupHeaderProps {
  formLevel: FormLevel;
  counts: CohortCounts;
  colSpan: number;
}

export function CohortGroupHeader({ formLevel, counts, colSpan }: CohortGroupHeaderProps) {
  return (
    <TableRow className="bg-muted/50 hover:bg-muted/50">
      <TableCell colSpan={colSpan} className="py-3">
        <span className="text-sm font-semibold">{formLevelLabel(formLevel)}</span>
        <span className="ml-4 text-sm text-muted-foreground">
          Draft: {counts.draft} · Finalised: {counts.finalised} · None: {counts.none}
        </span>
      </TableCell>
    </TableRow>
  );
}
