# Mobile PWA Specifications

## 📱 Progressive Web App Overview

Transform SecureMsg into a native app experience that users can install directly from their browser, providing offline capabilities and push notifications for seamless mobile messaging.

## 🎯 PWA Core Features

### Installation & App-Like Experience
- **Add to Home Screen**: Install directly from browser
- **Standalone Mode**: Runs without browser UI
- **App Icons**: Custom branded icons for all platforms
- **Splash Screen**: Professional loading experience
- **Status Bar**: Native app-style status bar integration

### Offline Capabilities
- **Service Worker**: Background message syncing
- **Cache Strategy**: Offline UI and recent messages
- **Background Sync**: Send messages when connection returns
- **Offline Indicator**: Clear connection status display

## 🛠️ Technical Implementation

### Manifest Configuration
```json
// public/manifest.json
{
  "name": "SecureMsg - Private Company Messaging",
  "short_name": "SecureMsg",
  "description": "Secure end-to-end encrypted messaging for private companies",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#00d4aa",
  "background_color": "#0a0a0a",
  "lang": "en",
  "scope": "/",
  "categories": ["business", "productivity", "communication"],
  "screenshots": [
    {
      "src": "/screenshots/mobile-terminal.png",
      "sizes": "390x844",
      "type": "image/png",
      "platform": "narrow",
      "label": "Terminal messaging interface"
    },
    {
      "src": "/screenshots/desktop-dashboard.png",
      "sizes": "1280x720",
      "type": "image/png",
      "platform": "wide",
      "label": "Desktop dashboard view"
    }
  ],
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ]
}
```

### Service Worker Implementation
```typescript
// public/sw.js - Service Worker for offline functionality
const CACHE_NAME = 'securemsg-v1';
const STATIC_CACHE = 'securemsg-static-v1';
const DYNAMIC_CACHE = 'securemsg-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/icons/icon-192x192.png',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
            .map(name => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then(cache => cache.put(event.request, responseToCache));

            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Background sync for messages
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  try {
    const messages = await getOfflineMessages();
    for (const message of messages) {
      await sendMessage(message);
      await deleteOfflineMessage(message.id);
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}
```

### PWA Registration
```typescript
// src/utils/pwa.ts - PWA registration and management
export class PWAManager {
  private deferredPrompt: any = null;

  async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('SW registered:', registration);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.notifyUpdate();
              }
            });
          }
        });
      } catch (error) {
        console.error('SW registration failed:', error);
      }
    }
  }

  setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
      this.hideInstallButton();
      this.trackInstall();
    });
  }

  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) return false;

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;

    return outcome === 'accepted';
  }

  private showInstallButton(): void {
    // Show Material UI install button
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'block';
    }
  }

  private hideInstallButton(): void {
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'none';
    }
  }

  private notifyUpdate(): void {
    // Show Material UI snackbar for app update
    this.showUpdateSnackbar();
  }

  private trackInstall(): void {
    // Analytics for PWA installation
    console.log('PWA installed successfully');
  }

  private showUpdateSnackbar(): void {
    // Implementation for update notification
  }
}
```

## 📱 Mobile-Specific Features

### Touch Gestures
```typescript
// src/components/TouchGestures.tsx
import { useSwipeable } from 'react-swipeable';

export const SwipeableTerminal: React.FC = () => {
  const handlers = useSwipeable({
    onSwipedLeft: () => showContactsList(),
    onSwipedRight: () => showCommands(),
    onSwipedUp: () => scrollToTop(),
    onSwipedDown: () => showKeyboard(),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  return (
    <Box {...handlers} sx={{ height: '100%', touchAction: 'pan-y' }}>
      <TerminalComponent />
    </Box>
  );
};
```

### Virtual Keyboard Optimization
```typescript
// Handle virtual keyboard appearance on mobile
export const useVirtualKeyboard = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      // Detect virtual keyboard
      const viewport = window.visualViewport;
      if (viewport) {
        const keyboardHeight = window.innerHeight - viewport.height;
        setKeyboardHeight(Math.max(0, keyboardHeight));
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport.removeEventListener('resize', handleResize);
    }
  }, []);

  return { keyboardHeight };
};
```

### Push Notifications
```typescript
// src/utils/notifications.ts
export class NotificationManager {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async showMessageNotification(message: {
    sender: string;
    content: string;
    timestamp: Date;
  }): Promise<void> {
    if (!this.hasPermission()) return;

    const notification = new Notification(`New message from ${message.sender}`, {
      body: message.content,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'new-message',
      requireInteraction: true,
      actions: [
        {
          action: 'reply',
          title: 'Reply',
          icon: '/icons/reply.png'
        },
        {
          action: 'view',
          title: 'View',
          icon: '/icons/view.png'
        }
      ]
    });

    notification.onclick = () => {
      window.focus();
      this.openMessage(message);
    };
  }

  private hasPermission(): boolean {
    return Notification.permission === 'granted';
  }

  private openMessage(message: any): void {
    // Navigate to conversation
  }
}
```

## 🎨 Mobile UI Optimizations

### Bottom Sheet for Mobile
```tsx
// Mobile-friendly bottom sheet for commands
import { SwipeableDrawer } from '@mui/material';

export const MobileCommandSheet: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={() => setOpen(false)}
      onOpen={() => setOpen(true)}
      swipeAreaWidth={56}
      disableSwipeToOpen={false}
      ModalProps={{ keepMounted: true }}
    >
      <Box sx={{ p: 2, minHeight: 200 }}>
        <Typography variant="h6" gutterBottom>
          Quick Commands
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<PersonAddIcon />}
              onClick={() => executeCommand('/connect')}
            >
              Connect
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ListIcon />}
              onClick={() => executeCommand('/list')}
            >
              List Contacts
            </Button>
          </Grid>
        </Grid>
      </Box>
    </SwipeableDrawer>
  );
};
```

### Haptic Feedback
```typescript
// Add haptic feedback for mobile interactions
export const useHapticFeedback = () => {
  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const lightTap = () => vibrate(10);
  const mediumTap = () => vibrate(20);
  const strongTap = () => vibrate([10, 10, 10]);

  return { lightTap, mediumTap, strongTap };
};
```

## 🔧 Performance Optimizations

### Lazy Loading for Mobile
```typescript
// Lazy load components for better mobile performance
const LazyTerminal = lazy(() => import('./components/Terminal'));
const LazyDashboard = lazy(() => import('./components/Dashboard'));

const MobileApp: React.FC = () => {
  return (
    <Suspense fallback={<CircularProgress />}>
      <Routes>
        <Route path="/terminal" element={<LazyTerminal />} />
        <Route path="/dashboard" element={<LazyDashboard />} />
      </Routes>
    </Suspense>
  );
};
```

### Image Optimization
```typescript
// Responsive images for different screen sizes
const ResponsiveAvatar: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  return (
    <picture>
      <source media="(max-width: 600px)" srcSet={`${src}?w=64&h=64`} />
      <source media="(max-width: 1200px)" srcSet={`${src}?w=128&h=128`} />
      <img src={`${src}?w=256&h=256`} alt={alt} loading="lazy" />
    </picture>
  );
};
```

## 📊 Mobile Analytics

### Usage Tracking
```typescript
// Track mobile-specific usage patterns
export const trackMobileUsage = () => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const orientation = screen.orientation?.type || 'unknown';

  return {
    platform: isMobile ? 'mobile' : 'desktop',
    mode: isStandalone ? 'standalone' : 'browser',
    orientation,
    screenSize: `${screen.width}x${screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`
  };
};
```

## 🚀 Deployment Considerations

### Cloudflare Pages PWA Setup
```typescript
// _headers file for PWA on Cloudflare Pages
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()

/manifest.json
  Content-Type: application/manifest+json
  Cache-Control: public, max-age=86400

/sw.js
  Content-Type: application/javascript
  Cache-Control: public, max-age=0

/icons/*
  Cache-Control: public, max-age=31536000
```

This PWA implementation transforms SecureMsg into a native app experience that users can install on their phones, providing offline messaging capabilities while maintaining the secure, terminal-style interface that makes it unique!