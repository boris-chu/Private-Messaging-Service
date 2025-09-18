# UI Design Specifications with Material UI

## 🎨 Design Philosophy

### Hybrid Interface Approach
- **Material UI**: Modern, professional interface for authentication, user management, and settings
- **Terminal Interface**: Unique, developer-friendly interface for actual messaging
- **Seamless Transition**: Smooth flow between modern UI and terminal experience

### Visual Hierarchy
```
┌─────────────────────────────────────────┐
│           Material UI Layer            │
│  ┌─────────────────────────────────────┐ │
│  │      Login/Registration/Setup       │ │
│  │         User Management            │ │
│  │        Settings & Profile          │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          Terminal Interface             │
│  ┌─────────────────────────────────────┐ │
│  │        Secure Messaging            │ │
│  │       Command Interface            │ │
│  │      Real-time Chat                │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## 🏗️ Application Architecture

### Route Structure
```
/ (landing)
├── /login              # Material UI login form
├── /register           # Material UI registration
├── /setup              # Material UI initial setup
├── /dashboard          # Material UI user management
│   ├── /profile        # Edit profile settings
│   ├── /contacts       # Manage contacts
│   └── /security       # Security settings
└── /terminal           # Terminal messaging interface
```

### Component Hierarchy
```
App (Material UI Theme Provider)
├── AuthGuard
├── Router
│   ├── AuthPages (Material UI)
│   │   ├── LoginPage
│   │   ├── RegisterPage
│   │   └── SetupPage
│   ├── DashboardPages (Material UI)
│   │   ├── DashboardHome
│   │   ├── ProfilePage
│   │   ├── ContactsPage
│   │   └── SecurityPage
│   └── TerminalPage (Custom Terminal UI)
└── NotificationProvider
```

## 🔐 Authentication Flow with Material UI

### 1. Landing Page
```tsx
// Modern landing page with Material UI
<Container maxWidth="md">
  <Box sx={{ textAlign: 'center', py: 8 }}>
    <Typography variant="h2" component="h1" gutterBottom>
      SecureMsg
    </Typography>
    <Typography variant="h5" color="text.secondary" paragraph>
      Private Company Secure Messaging
    </Typography>
    <Stack direction="row" spacing={2} justifyContent="center">
      <Button variant="contained" size="large" href="/login">
        Sign In
      </Button>
      <Button variant="outlined" size="large" href="/register">
        Create Account
      </Button>
    </Stack>
  </Box>
</Container>
```

### 2. Registration Page
```tsx
// Material UI registration form with Cloudflare Turnstile
<Card sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
  <CardContent>
    <Typography variant="h4" component="h1" gutterBottom>
      Create Account
    </Typography>

    <Box component="form" sx={{ mt: 2 }}>
      <TextField
        fullWidth
        label="Username"
        variant="outlined"
        margin="normal"
        required
        helperText="This will be your unique identifier"
      />

      <TextField
        fullWidth
        label="Email"
        type="email"
        variant="outlined"
        margin="normal"
        required
      />

      <TextField
        fullWidth
        label="Full Name"
        variant="outlined"
        margin="normal"
        required
      />

      <TextField
        fullWidth
        label="Company"
        variant="outlined"
        margin="normal"
        required
      />

      <FormControlLabel
        control={<Checkbox required />}
        label="I agree to the security policies"
      />

      {/* Cloudflare Turnstile Verification */}
      <Box sx={{ mt: 2, mb: 2 }}>
        <TurnstileWidget
          siteKey={TURNSTILE_SITE_KEY}
          onVerify={setTurnstileToken}
          theme="dark"
        />
      </Box>

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        size="large"
        disabled={!turnstileToken}
      >
        Create Account
      </Button>
    </Box>
  </CardContent>
</Card>
```

### 3. Login Page
```tsx
// Material UI login form with Cloudflare Turnstile
<Card sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
  <CardContent>
    <Typography variant="h4" component="h1" gutterBottom>
      Sign In
    </Typography>

    <Box component="form" sx={{ mt: 2 }}>
      <TextField
        fullWidth
        label="Username"
        variant="outlined"
        margin="normal"
        required
        autoFocus
      />

      <TextField
        fullWidth
        label="Password"
        type="password"
        variant="outlined"
        margin="normal"
        required
      />

      <FormControlLabel
        control={<Checkbox />}
        label="Remember me"
      />

      {/* Cloudflare Turnstile - Show only after failed attempts or suspicious activity */}
      {showCaptcha && (
        <Box sx={{ mt: 2, mb: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Please verify you're human to continue
          </Alert>
          <TurnstileWidget
            siteKey={TURNSTILE_SITE_KEY}
            onVerify={setTurnstileToken}
            theme="dark"
          />
        </Box>
      )}

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        size="large"
        disabled={showCaptcha && !turnstileToken}
      >
        Sign In
      </Button>

      <Box sx={{ textAlign: 'center' }}>
        <Link href="/register" variant="body2">
          Don't have an account? Sign up
        </Link>
      </Box>
    </Box>
  </CardContent>
</Card>
```

## 👥 User Management Dashboard

### Dashboard Layout
```tsx
<Box sx={{ display: 'flex' }}>
  {/* Sidebar Navigation */}
  <Drawer
    variant="permanent"
    sx={{
      width: 240,
      '& .MuiDrawer-paper': { width: 240 }
    }}
  >
    <List>
      <ListItem>
        <ListItemIcon><DashboardIcon /></ListItemIcon>
        <ListItemText primary="Dashboard" />
      </ListItem>
      <ListItem>
        <ListItemIcon><PersonIcon /></ListItemIcon>
        <ListItemText primary="Profile" />
      </ListItem>
      <ListItem>
        <ListItemIcon><ContactsIcon /></ListItemIcon>
        <ListItemText primary="Contacts" />
      </ListItem>
      <ListItem>
        <ListItemIcon><SecurityIcon /></ListItemIcon>
        <ListItemText primary="Security" />
      </ListItem>
      <Divider />
      <ListItem button onClick={openTerminal}>
        <ListItemIcon><TerminalIcon /></ListItemIcon>
        <ListItemText primary="Open Terminal" />
      </ListItem>
    </List>
  </Drawer>

  {/* Main Content */}
  <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
    {/* Dashboard content */}
  </Box>
</Box>
```

### Contacts Management
```tsx
// Material UI contacts list
<Card>
  <CardHeader
    title="Contacts"
    action={
      <Button variant="contained" startIcon={<AddIcon />}>
        Add Contact
      </Button>
    }
  />
  <CardContent>
    <List>
      {contacts.map((contact) => (
        <ListItem key={contact.id}>
          <ListItemAvatar>
            <Avatar>{contact.name.charAt(0)}</Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={contact.name}
            secondary={
              <Box>
                <Typography variant="body2">@{contact.username}</Typography>
                <Chip
                  size="small"
                  label={contact.status}
                  color={contact.online ? 'success' : 'default'}
                />
              </Box>
            }
          />
          <ListItemSecondaryAction>
            <IconButton onClick={() => startChat(contact)}>
              <ChatIcon />
            </IconButton>
            <IconButton>
              <MoreVertIcon />
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  </CardContent>
</Card>
```

### Add Contact Dialog
```tsx
<Dialog open={addContactOpen} onClose={handleClose} maxWidth="sm" fullWidth>
  <DialogTitle>Add New Contact</DialogTitle>
  <DialogContent>
    <TextField
      autoFocus
      margin="dense"
      label="Username"
      fullWidth
      variant="outlined"
      helperText="Enter the username of the person you want to add"
    />
    <TextField
      margin="dense"
      label="Display Name (Optional)"
      fullWidth
      variant="outlined"
    />
    <FormControlLabel
      control={<Checkbox />}
      label="Send connection request immediately"
    />
  </DialogContent>
  <DialogActions>
    <Button onClick={handleClose}>Cancel</Button>
    <Button variant="contained" onClick={handleAddContact}>
      Add Contact
    </Button>
  </DialogActions>
</Dialog>
```

## 🖥️ Terminal Interface Integration

### Terminal Launch from Dashboard
```tsx
// Floating Action Button to enter terminal mode
<Fab
  color="primary"
  sx={{
    position: 'fixed',
    bottom: 16,
    right: 16,
  }}
  onClick={enterTerminalMode}
>
  <TerminalIcon />
</Fab>

// Or dedicated terminal page transition
const enterTerminalMode = () => {
  // Smooth transition to full-screen terminal
  setTerminalMode(true);
  navigate('/terminal');
};
```

### Terminal Header with Material UI
```tsx
// Terminal mode with Material UI header
<Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
  {/* Material UI Header */}
  <AppBar position="static" color="transparent" elevation={0}>
    <Toolbar>
      <IconButton onClick={exitTerminal}>
        <ArrowBackIcon />
      </IconButton>
      <Typography variant="h6" sx={{ flexGrow: 1 }}>
        SecureMsg Terminal
      </Typography>
      <Chip
        label={`Connected as ${username}`}
        color="success"
        size="small"
      />
      <IconButton onClick={openSettings}>
        <SettingsIcon />
      </IconButton>
    </Toolbar>
  </AppBar>

  {/* Terminal Interface */}
  <Box sx={{ flexGrow: 1, bgcolor: '#1e1e1e' }}>
    <TerminalComponent />
  </Box>
</Box>
```

## 🎨 Material UI Theme Configuration

### Custom Theme
```tsx
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark', // Dark theme for terminal feel
    primary: {
      main: '#00d4aa', // Terminal green
    },
    secondary: {
      main: '#ff6b35', // Warning orange
    },
    background: {
      default: '#0a0a0a',
      paper: '#1a1a1a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
  },
  typography: {
    fontFamily: '"JetBrains Mono", "Roboto Mono", monospace',
    h1: {
      fontFamily: '"Inter", "Roboto", sans-serif',
    },
    h2: {
      fontFamily: '"Inter", "Roboto", sans-serif',
    },
    // Terminal font for code/commands
    body2: {
      fontFamily: '"JetBrains Mono", monospace',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});
```

## 📱 Responsive Design

### Mobile Considerations
```tsx
// Responsive layout for mobile
<Box sx={{
  display: 'flex',
  flexDirection: { xs: 'column', md: 'row' },
  height: '100vh'
}}>
  {/* Mobile: Bottom navigation, Desktop: Sidebar */}
  <Hidden mdUp>
    <BottomNavigation>
      <BottomNavigationAction label="Dashboard" icon={<DashboardIcon />} />
      <BottomNavigationAction label="Contacts" icon={<ContactsIcon />} />
      <BottomNavigationAction label="Terminal" icon={<TerminalIcon />} />
      <BottomNavigationAction label="Settings" icon={<SettingsIcon />} />
    </BottomNavigation>
  </Hidden>
</Box>
```

## 🔔 Notifications & Alerts

### Material UI Snackbar Integration
```tsx
// Real-time notifications
<Snackbar
  open={notification.open}
  autoHideDuration={6000}
  onClose={handleCloseNotification}
>
  <Alert severity={notification.type} onClose={handleCloseNotification}>
    {notification.message}
  </Alert>
</Snackbar>

// Connection status indicators
<Chip
  icon={notification.type === 'online' ? <WiFiIcon /> : <WifiOffIcon />}
  label={`${username} is ${status}`}
  color={status === 'online' ? 'success' : 'default'}
  size="small"
/>
```

## 🔐 Security Settings UI

### Material UI Security Dashboard
```tsx
<Card>
  <CardHeader title="Security Settings" />
  <CardContent>
    <List>
      <ListItem>
        <ListItemText
          primary="Two-Factor Authentication"
          secondary="Add extra security to your account"
        />
        <Switch checked={twoFactorEnabled} onChange={handleToggle2FA} />
      </ListItem>

      <ListItem>
        <ListItemText
          primary="Key Rotation"
          secondary="Automatically rotate encryption keys"
        />
        <FormControl size="small">
          <Select value={keyRotation}>
            <MenuItem value="daily">Daily</MenuItem>
            <MenuItem value="weekly">Weekly</MenuItem>
            <MenuItem value="monthly">Monthly</MenuItem>
          </Select>
        </FormControl>
      </ListItem>

      <ListItem>
        <ListItemText
          primary="Session Timeout"
          secondary="Auto-logout after inactivity"
        />
        <TextField
          size="small"
          type="number"
          value={sessionTimeout}
          InputProps={{ endAdornment: 'minutes' }}
        />
      </ListItem>
    </List>
  </CardContent>
</Card>
```

## 🤖 Cloudflare Turnstile Integration

### Turnstile Widget Component
```tsx
// Custom Turnstile wrapper component
import { useEffect, useRef } from 'react';

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  siteKey,
  onVerify,
  theme = 'auto',
  size = 'normal'
}) => {
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (widgetRef.current && window.turnstile) {
      window.turnstile.render(widgetRef.current, {
        sitekey: siteKey,
        callback: onVerify,
        theme,
        size,
      });
    }
  }, [siteKey, onVerify, theme, size]);

  return <div ref={widgetRef} />;
};
```

### Environment Configuration
```typescript
// Environment variables for Turnstile
interface TurnstileConfig {
  siteKey: string; // Public site key from Cloudflare dashboard
  secretKey: string; // Secret key for server-side verification (Workers)
}

// Frontend configuration
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

// Workers configuration
const TURNSTILE_SECRET_KEY = env.TURNSTILE_SECRET_KEY;
```

### Server-Side Verification (Cloudflare Workers)
```typescript
// Verify Turnstile token in Workers
async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      secret: TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: ip,
    }),
  });

  const result = await response.json();
  return result.success;
}

// Registration endpoint with Turnstile verification
async function handleRegistration(request: Request): Promise<Response> {
  const { username, email, turnstileToken } = await request.json();
  const clientIP = request.headers.get('CF-Connecting-IP') || '';

  // Verify Turnstile token first
  const isHuman = await verifyTurnstileToken(turnstileToken, clientIP);
  if (!isHuman) {
    return new Response(JSON.stringify({
      error: 'Verification failed. Please try again.'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Proceed with registration...
  return createUser(username, email);
}
```

### Advanced Bot Protection
```typescript
// Smart Turnstile triggering based on risk factors
const shouldShowCaptcha = (loginAttempts: number, riskScore: number): boolean => {
  return (
    loginAttempts >= 3 ||           // Failed attempts
    riskScore > 0.7 ||              // High risk IP/behavior
    suspiciousActivity ||           // Rate limiting triggered
    newDevice                       // First time device
  );
};

// Progressive security enhancement
<Box component="form">
  {/* Standard form fields */}

  {/* Adaptive Turnstile display */}
  {shouldShowCaptcha(attempts, risk) && (
    <Fade in timeout={500}>
      <Box sx={{ mt: 2, mb: 2 }}>
        <Alert severity="info" icon={<SecurityIcon />}>
          Additional verification required for security
        </Alert>
        <TurnstileWidget
          siteKey={TURNSTILE_SITE_KEY}
          onVerify={setTurnstileToken}
          theme="dark"
          size="compact"
        />
      </Box>
    </Fade>
  )}
</Box>
```

### Integration with Rate Limiting
```typescript
// Cloudflare Workers rate limiting with Turnstile fallback
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const rateLimitKey = `rate_limit:${getClientIP(request)}`;
    const attempts = await env.KV.get(rateLimitKey) || 0;

    // If rate limited, require Turnstile verification
    if (attempts > 5) {
      const { turnstileToken } = await request.json();

      if (!turnstileToken) {
        return new Response(JSON.stringify({
          error: 'Rate limited. Verification required.',
          requiresCaptcha: true
        }), { status: 429 });
      }

      const verified = await verifyTurnstileToken(turnstileToken, getClientIP(request));
      if (!verified) {
        return new Response(JSON.stringify({
          error: 'Verification failed'
        }), { status: 400 });
      }

      // Reset rate limit on successful verification
      await env.KV.delete(rateLimitKey);
    }

    // Process request normally...
  }
};
```

### Analytics & Monitoring
```typescript
// Track Turnstile verification events
const logTurnstileEvent = async (event: string, metadata: any) => {
  await fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({
      event: `turnstile_${event}`,
      timestamp: Date.now(),
      metadata
    })
  });
};

// Usage in component
const handleTurnstileVerify = (token: string) => {
  setTurnstileToken(token);
  logTurnstileEvent('verified', {
    page: 'registration',
    userAgent: navigator.userAgent
  });
};
```

## 🛡️ Security Benefits

### Turnstile Advantages
- **Privacy-First**: No tracking, no data collection
- **Invisible**: Often works without user interaction
- **Fast**: Sub-100ms verification times
- **Accessible**: Screen reader and keyboard friendly
- **Integrated**: Native Cloudflare ecosystem integration

### Attack Prevention
- **Bot Registration**: Prevents automated account creation
- **Credential Stuffing**: Stops automated login attempts
- **Scraping**: Protects user enumeration
- **DDoS**: Rate limiting with human verification fallback

This design approach gives you:
- **Professional UI** for user management and settings
- **Unique terminal experience** for messaging
- **Bot protection** with Cloudflare Turnstile
- **Smooth transitions** between interfaces
- **Mobile responsive** design
- **Consistent Material Design** language
- **Security-focused** user experience
- **Privacy-preserving** verification

The combination creates an enterprise-grade messaging application that's both modern, unique, and highly secure against automated attacks!