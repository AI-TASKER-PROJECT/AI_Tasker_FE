import { ExternalLink, FileText } from 'lucide-react';
import { useState } from 'react';
import { profileApi } from '../services';
import { Button, Notice } from './ui';

type FirebaseFileLinkProps = {
  path?: string | null;
  emptyText?: string;
  buttonText?: string;
  className?: string;
  showPath?: boolean;
};

export function FirebaseFileLink({
  path,
  emptyText = 'Chưa có file',
  buttonText = 'Xem file',
  className,
  showPath = true,
}: FirebaseFileLinkProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const openFile = async () => {
    if (!path) return;
    setLoading(true);
    setError('');
    try {
      const viewUrl = await profileApi.getFileViewUrl(path);
      window.open(viewUrl, '_blank', 'noopener,noreferrer');
    } catch (openError) {
      const apiError = openError as { response?: { data?: { message?: string } }; message?: string };
      setError(apiError.response?.data?.message || apiError.message || 'Không thể mở file Firebase.');
    } finally {
      setLoading(false);
    }
  };

  if (!path) {
    return <p className="text-sm font-semibold text-slate-400">{emptyText}</p>;
  }

  return (
    <div className={className}>
      <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-100 bg-white p-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          {showPath && (
            <p className="break-all text-xs font-semibold leading-5 text-slate-500">{path}</p>
          )}
          <div className={showPath ? 'mt-2' : ''}>
            <Button type="button" variant="secondary" size="sm" loading={loading} onClick={openFile}>
              <ExternalLink className="h-4 w-4" />
              {buttonText}
            </Button>
          </div>
        </div>
      </div>
      {error && <Notice tone="danger" title={error} className="mt-2" />}
    </div>
  );
}
