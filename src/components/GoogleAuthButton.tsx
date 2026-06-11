import { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '../lib/googleAuth';
import { Notice } from './ui';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              width?: number;
              locale?: string;
            },
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_ID = 'google-identity-services';
let googleScriptPromise: Promise<void> | null = null;

function loadGoogleScript() {
  if (window.google) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  const existing = document.getElementById(GOOGLE_SCRIPT_ID);
  if (existing) {
    googleScriptPromise = new Promise<void>((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Không tải được Google Identity Services')), { once: true });
    });
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Không tải được Google Identity Services'));
    document.head.appendChild(script);
  });
  return googleScriptPromise;
}

export function GoogleAuthButton({
  mode,
  onCredential,
  onError,
}: {
  mode: 'login' | 'register';
  onCredential: (credential: string) => void;
  onError?: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        if (!window.google) throw new Error('Google Identity Services chưa sẵn sàng.');
        containerRef.current.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (!response.credential) {
              const message = 'Google không trả về credential.';
              setError(message);
              onError?.(message);
              return;
            }
            onCredential(response.credential);
          },
          cancel_on_tap_outside: true,
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: mode === 'login' ? 'signin_with' : 'signup_with',
          width: 360,
          locale: 'vi',
        });
      })
      .catch(() => {
        const message = 'Không tải được Google Sign-In. Kiểm tra kết nối mạng hoặc cấu hình client ID.';
        setError(message);
        onError?.(message);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, onCredential, onError]);

  return (
    <div>
      <div ref={containerRef} className="flex min-h-11 justify-center" />
      {error && (
        <Notice tone="danger" title="Google Sign-In lỗi" className="mt-3">
          {error}
        </Notice>
      )}
    </div>
  );
}
