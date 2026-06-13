import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { UserInfo } from '@/App';
import { apiFetch, apiGet } from '@/api/apiClient';
import { msalInstance } from '@/auth/msalConfig';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

interface SettingsPageProps {
  userInfo: UserInfo | null;
}

type SchoolSettings = {
  id: string;
  schoolName: string;
  schoolAddress: string | null;
  letterheadHtml: string | null;
  logoPath: string | null;
  updatedAt: string;
};

const API_SCOPE = `api://${import.meta.env.VITE_CLIENT_ID}/access_as_user`;

async function acquireAccessToken(): Promise<string> {
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
  if (!account) throw new Error('No active account');

  const tokenResponse = await msalInstance.acquireTokenSilent({
    scopes: [API_SCOPE],
    account,
  });
  return tokenResponse.accessToken;
}

async function uploadSettingsWithLogo(
  formData: FormData,
  token: string,
): Promise<SchoolSettings> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as SchoolSettings);
        } catch {
          reject(new Error('Invalid JSON response'));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.open('PUT', '/api/settings');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

async function fetchLogoObjectUrl(token: string): Promise<string | null> {
  const res = await fetch('/api/settings/logo', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Logo fetch failed: ${res.status}`);

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export function SettingsPage({ userInfo }: SettingsPageProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [letterheadHtml, setLetterheadHtml] = useState('');
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const revokeLogoPreview = useCallback((url: string | null) => {
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }, []);

  const loadLogoPreview = useCallback(
    async (hasLogoPath: boolean) => {
      if (!hasLogoPath) {
        setLogoPreviewUrl((prev) => {
          revokeLogoPreview(prev);
          return null;
        });
        return;
      }

      try {
        const token = await acquireAccessToken();
        const objectUrl = await fetchLogoObjectUrl(token);
        setLogoPreviewUrl((prev) => {
          revokeLogoPreview(prev);
          return objectUrl;
        });
      } catch {
        setLogoPreviewUrl((prev) => {
          revokeLogoPreview(prev);
          return null;
        });
      }
    },
    [revokeLogoPreview],
  );

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await apiGet<SchoolSettings | null>('/settings');
      if (settings) {
        setSchoolName(settings.schoolName ?? '');
        setSchoolAddress(settings.schoolAddress ?? '');
        setLetterheadHtml(settings.letterheadHtml ?? '');
        setLogoPath(settings.logoPath);
        await loadLogoPreview(Boolean(settings.logoPath));
      } else {
        setSchoolName('');
        setSchoolAddress('');
        setLetterheadHtml('');
        setLogoPath(null);
        setLogoPreviewUrl((prev) => {
          revokeLogoPreview(prev);
          return null;
        });
      }
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 403) {
        navigate('/unauthorized', { replace: true });
        return;
      }
      toast.error("Couldn't load settings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [loadLogoPreview, navigate, revokeLogoPreview]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    return () => {
      revokeLogoPreview(logoPreviewUrl);
    };
  }, [logoPreviewUrl, revokeLogoPreview]);

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedLogoFile(file);
    setLogoPreviewUrl((prev) => {
      revokeLogoPreview(prev);
      return URL.createObjectURL(file);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = schoolName.trim();
    if (!trimmedName) {
      setNameError('School name is required');
      return;
    }
    setNameError(null);
    setSaving(true);

    try {
      if (selectedLogoFile) {
        const token = await acquireAccessToken();
        const formData = new FormData();
        formData.append('schoolName', trimmedName);
        if (schoolAddress.trim()) {
          formData.append('schoolAddress', schoolAddress.trim());
        }
        if (letterheadHtml.trim()) {
          formData.append('letterheadHtml', letterheadHtml);
        }
        formData.append('logo', selectedLogoFile);

        const updated = await uploadSettingsWithLogo(formData, token);
        setLogoPath(updated.logoPath);
        setSelectedLogoFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const res = await apiFetch('/settings', {
          method: 'PUT',
          body: JSON.stringify({
            schoolName: trimmedName,
            schoolAddress: schoolAddress.trim() || undefined,
            letterheadHtml: letterheadHtml || undefined,
          }),
        });
        if (!res.ok) {
          throw new Error(`Save failed: ${res.status}`);
        }
        const updated = (await res.json()) as SchoolSettings;
        setLogoPath(updated.logoPath);
      }

      toast.success('Settings saved');
      await loadSettings();
    } catch {
      toast.error("Couldn't save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const showServerLogo = logoPath && !selectedLogoFile;

  return (
    <AppShell userInfo={userInfo} activeNav={'settings' as 'home'}>
      <h1 className="text-2xl font-semibold leading-tight">Settings</h1>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold leading-tight">School branding</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {loading ? (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-20 w-20 rounded-md" />
                <Skeleton className="h-[240px] w-full" />
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="school-name">School name</Label>
                  <Input
                    id="school-name"
                    value={schoolName}
                    onChange={(e) => {
                      setSchoolName(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    placeholder="e.g. St Paul's Co-educational College"
                    maxLength={100}
                    required
                  />
                  {nameError && (
                    <p className="text-sm text-destructive">{nameError}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="school-address">School address</Label>
                  <Textarea
                    id="school-address"
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                    placeholder="Street address, city, country"
                    className="min-h-[80px]"
                    maxLength={300}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="logo-file-input">School logo</Label>
                  <input
                    ref={fileInputRef}
                    id="logo-file-input"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    aria-required="false"
                    onChange={handleLogoFileChange}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose image
                    </Button>
                    {selectedLogoFile && (
                      <span className="text-sm text-muted-foreground">{selectedLogoFile.name}</span>
                    )}
                    {showServerLogo && !selectedLogoFile && (
                      <span className="text-sm text-muted-foreground">Current logo</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">JPG, PNG or GIF — uploaded on save</p>
                  {logoPreviewUrl && (
                    <img
                      src={logoPreviewUrl}
                      alt={showServerLogo ? 'Current school logo' : 'Selected logo preview'}
                      className="h-20 w-20 rounded-md border object-contain"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="letterhead-html">Letterhead HTML</Label>
                  <Textarea
                    id="letterhead-html"
                    value={letterheadHtml}
                    onChange={(e) => setLetterheadHtml(e.target.value)}
                    placeholder="<!-- Paste your letterhead HTML/CSS here -->"
                    className="min-h-[240px] font-mono text-sm"
                    aria-describedby="letterhead-hint"
                  />
                  <p id="letterhead-hint" className="text-sm text-muted-foreground">
                    This HTML is injected as the header of every exported transcript PDF.
                  </p>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={loading || saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </AppShell>
  );
}
