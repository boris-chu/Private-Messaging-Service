import React, { useEffect, useRef } from 'react';

interface TurnstileAPI {
  render: (container: string | HTMLElement, options: {
    sitekey: string;
    callback?: (token: string) => void;
    'error-callback'?: () => void;
    theme?: string;
  }) => string;
  remove: (widgetId: string) => void;
  reset?: (container: string | HTMLElement) => void;
}

declare global {
  interface Window {
    turnstile: TurnstileAPI;
  }
}

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  siteKey,
  onVerify,
  theme = 'dark',
  size = 'normal'
}) => {
  const widgetRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Load Turnstile script if not already loaded
    if (!scriptLoadedRef.current && !document.querySelector('script[src*="turnstile"]')) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      scriptLoadedRef.current = true;
    }

    const checkTurnstile = () => {
      if (widgetRef.current && window.turnstile) {
        // Clear any existing widget
        if (widgetRef.current.innerHTML) {
          widgetRef.current.innerHTML = '';
        }

        try {
          window.turnstile.render(widgetRef.current, {
            sitekey: siteKey,
            callback: onVerify,
            theme,
            size,
            'error-callback': () => {
              console.error('Turnstile error');
            },
            'expired-callback': () => {
              console.warn('Turnstile token expired');
            }
          });
        } catch (error) {
          console.error('Failed to render Turnstile widget:', error);
        }
      } else {
        // Retry after a short delay
        setTimeout(checkTurnstile, 100);
      }
    };

    checkTurnstile();

    // Cleanup function
    return () => {
      if (widgetRef.current && window.turnstile) {
        try {
          // Reset the widget if Turnstile provides a reset method
          if (window.turnstile.reset) {
            window.turnstile.reset(widgetRef.current);
          }
        } catch (error) {
          console.error('Failed to reset Turnstile widget:', error);
        }
      }
    };
  }, [siteKey, onVerify, theme, size]);

  return (
    <div
      ref={widgetRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        minHeight: size === 'compact' ? '65px' : '130px'
      }}
    />
  );
};