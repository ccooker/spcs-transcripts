import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiGet, apiDelete } from '@/api/apiClient';
import { msalInstance } from '@/auth/msalConfig';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RecordSectionCard } from './RecordSectionCard';
import { Download, Trash2 } from 'lucide-react';

interface Document {
  id: string;
  originalFilename: string;
  typeTag: string;
  createdAt: string;
  uploader: { displayName: string };
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  REPORT_CARD: 'Report Card',
  CERTIFICATE: 'Certificate',
  AWARD_LETTER: 'Award Letter',
  WORK_EXPERIENCE_LETTER: 'Work Experience Letter',
  REFERENCE_LETTER: 'Reference Letter',
  OTHER: 'Other',
};

const API_SCOPE = `api://${import.meta.env.VITE_CLIENT_ID}/access_as_user`;

// Do NOT set the multipart header manually — browser adds the correct boundary automatically.
// Manually overriding it corrupts the boundary and the server cannot parse the upload.
async function uploadDocumentWithProgress(
  studentId: string,
  file: File,
  typeTag: string,
  token: string,
  onProgress: (percent: number) => void,
): Promise<Document> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('typeTag', typeTag);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as Document);
        } catch {
          reject(new Error('Invalid JSON response'));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));

    xhr.open('POST', `/api/students/${studentId}/documents`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

function formatUploadDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface DocumentsSectionProps {
  studentId: string;
}

export function DocumentsSection({ studentId }: DocumentsSectionProps) {
  const queryClient = useQueryClient();
  const queryKey = ['student', studentId, 'documents'] as const;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedType, setSelectedType] = useState('');
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => apiGet<Document[]>(`/students/${studentId}/documents`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/students/${studentId}/documents/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success('Document deleted');
      setDeleteTarget(null);
    },
    onError: () => toast.error("Couldn't delete document. Please try again."),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setFileError('Only PDF files are accepted.');
      setSelectedFile(null);
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setFileError('File exceeds the 25 MB limit. Choose a smaller file and try again.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setFileError(null);
  }

  async function handleUpload() {
    if (!selectedFile || !selectedType) return;

    setUploading(true);
    setUploadPercent(0);

    try {
      const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
      if (!account) throw new Error('No active account');

      const tokenResponse = await msalInstance.acquireTokenSilent({
        scopes: [API_SCOPE],
        account,
      });

      await uploadDocumentWithProgress(
        studentId,
        selectedFile,
        selectedType,
        tokenResponse.accessToken,
        setUploadPercent,
      );

      setUploadDialogOpen(false);
      toast.success('Document uploaded');
      void queryClient.invalidateQueries({ queryKey });
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadPercent(0);
    }
  }

  function handleDialogOpenChange(open: boolean) {
    if (!open) {
      setSelectedFile(null);
      setSelectedType('');
      setFileError(null);
      setUploadPercent(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    setUploadDialogOpen(open);
  }

  async function handleDownload(doc: Document) {
    try {
      const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
      if (!account) throw new Error('No active account');

      const tokenResponse = await msalInstance.acquireTokenSilent({
        scopes: [API_SCOPE],
        account,
      });

      const res = await fetch(`/api/students/${studentId}/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${tokenResponse.accessToken}` },
      });

      if (!res.ok) {
        toast.error('Download failed. Please try again.');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.originalFilename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed. Please try again.');
    }
  }

  const truncateFilename = (name: string, max: number) =>
    name.length > max ? `${name.slice(0, max)}…` : name;

  return (
    <>
      <RecordSectionCard
        title="Documents"
        count={data.length}
        addLabel="Upload document"
        onAdd={() => setUploadDialogOpen(true)}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        isEmpty={data.length === 0}
        emptyHeading="No documents yet."
        emptyBody="Upload PDF files to attach supporting documents to this student's record."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Uploader</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="max-w-[240px]">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm font-semibold truncate block max-w-[240px]">
                        {doc.originalFilename}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{doc.originalFilename}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {DOCUMENT_TYPE_LABELS[doc.typeTag] ?? doc.typeTag}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatUploadDate(doc.createdAt)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {doc.uploader.displayName}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Download ${doc.originalFilename}`}
                      onClick={() => void handleDownload(doc)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete document"
                      className="hover:text-destructive"
                      onClick={() => setDeleteTarget(doc)}
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

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload document</DialogTitle>
            <DialogDescription className="sr-only">
              Select a PDF file and document type to upload.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File picker */}
            <div className="space-y-1">
              <Label htmlFor="doc-file-input">
                PDF file <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  id="doc-file-input"
                  type="file"
                  accept=".pdf"
                  aria-required="true"
                  className="sr-only"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose file
                </Button>
                {selectedFile && (
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {truncateFilename(selectedFile.name, 40)}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">PDF only, max 25 MB</p>
              {fileError && (
                <p className="text-sm text-destructive">{fileError}</p>
              )}
            </div>

            {/* Document type */}
            <div className="space-y-1">
              <Label htmlFor="doc-type-select">
                Document type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedType}
                onValueChange={setSelectedType}
                disabled={uploading}
              >
                <SelectTrigger id="doc-type-select">
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REPORT_CARD">Report Card</SelectItem>
                  <SelectItem value="CERTIFICATE">Certificate</SelectItem>
                  <SelectItem value="AWARD_LETTER">Award Letter</SelectItem>
                  <SelectItem value="WORK_EXPERIENCE_LETTER">Work Experience Letter</SelectItem>
                  <SelectItem value="REFERENCE_LETTER">Reference Letter</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Upload progress */}
            {uploading && (
              <div aria-live="polite">
                <Progress
                  value={uploadPercent}
                  className="w-full mt-4"
                  aria-label="Upload progress"
                  aria-valuenow={uploadPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
                <p className="text-sm text-muted-foreground mt-1 text-right">
                  Uploading… {uploadPercent}%
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={uploading}
            >
              Discard upload
            </Button>
            <Button
              type="button"
              disabled={!selectedFile || !selectedType || uploading}
              onClick={() => void handleUpload()}
            >
              {uploading ? 'Uploading…' : 'Upload document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document</AlertDialogTitle>
            <AlertDialogDescription>
              This document will be removed from the list. The file is retained in the system with an audit trail entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep document</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete document'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
