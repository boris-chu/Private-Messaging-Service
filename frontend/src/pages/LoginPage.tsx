import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Container,
  TextField,
  Button,
  Typography,
  Link,
  FormControlLabel,
  Checkbox,
  Alert,
  Fade,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SecurityIcon from '@mui/icons-material/Security';
import { TurnstileWidget } from '../components/TurnstileWidget';
import { PasswordRecovery } from '../components/PasswordRecovery';
import { AnonymousLogin } from '../components/AnonymousLogin';
import { apiService } from '../services/apiService';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showAnonymousLogin, setShowAnonymousLogin] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.login({
        username,
        password,
        turnstileToken: turnstileToken || undefined
      });

      if (response.success) {
        // Store token in localStorage for demo purposes
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        navigate('/dashboard');
      }
    } catch (err) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

      if (newAttempts >= 3) {
        setShowCaptcha(true);
      }

      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = username.trim() && password.trim() && (!showCaptcha || turnstileToken);

  const handleRecoveryComplete = () => {
    setError(null);
    setShowRecovery(false);
    // Optionally show success message
    alert('Password reset successful! You can now login with your new password.');
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: 'background.default',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Container maxWidth="sm" sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 4 }
      }}>
        <Card sx={{
          width: '100%',
          maxWidth: { xs: '100%', md: 400 },
          mx: 'auto'
        }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          {/* Logo/Title */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <SecurityIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                fontSize: { xs: '1.75rem', md: '2rem' },
                fontWeight: 600
              }}
            >
              Axol Chat
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Axol — private talk, under the shell.
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Fade in timeout={300}>
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            </Fade>
          )}

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              variant="outlined"
              margin="normal"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              InputProps={{
                sx: { fontSize: { xs: '16px', md: '14px' } } // Prevent zoom on iOS
              }}
            />

            <TextField
              fullWidth
              label="Password"
              type="password"
              variant="outlined"
              margin="normal"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              InputProps={{
                sx: { fontSize: { xs: '16px', md: '14px' } }
              }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
              }
              label="Remember me"
              sx={{ mt: 1, mb: 2 }}
            />

            {/* Cloudflare Turnstile - Show after failed attempts */}
            {showCaptcha && (
              <Fade in timeout={500}>
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Alert severity="info" sx={{ mb: 2 }} icon={<SecurityIcon />}>
                    Please verify you're human to continue
                  </Alert>
                  <TurnstileWidget
                    siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || 'demo-site-key'}
                    onVerify={setTurnstileToken}
                    theme="dark"
                  />
                </Box>
              </Fade>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={!isFormValid || isLoading}
              sx={{
                mt: 3,
                mb: 2,
                minHeight: { xs: 48, md: 44 },
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 6px 20px rgba(0, 212, 170, 0.4)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                }
              }}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>

            {/* Anonymous Login Button */}
            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={() => setShowAnonymousLogin(true)}
              sx={{
                mt: 2,
                mb: 2,
                minHeight: { xs: 48, md: 44 },
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  borderColor: 'primary.dark',
                  bgcolor: 'primary.main',
                  color: 'white',
                }
              }}
            >
              Start Anonymous Conversation
            </Button>

            {/* Footer Links */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowRecovery(true);
                  }}
                  sx={{
                    textDecoration: 'none',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    '&:hover': {
                      textDecoration: 'underline',
                    }
                  }}
                >
                  Forgot your password?
                </Link>
                <Link
                  href="/register"
                  variant="body2"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/register');
                  }}
                  sx={{
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    }
                  }}
                >
                  Don't have an account? Sign up
                </Link>
              </Box>
            </Box>
          </Box>
        </CardContent>
        </Card>
      </Container>

      {/* Password Recovery Dialog */}
      <PasswordRecovery
        open={showRecovery}
        onClose={() => setShowRecovery(false)}
        onRecoveryComplete={handleRecoveryComplete}
      />

      {/* Anonymous Login Dialog */}
      <AnonymousLogin
        open={showAnonymousLogin}
        onClose={() => setShowAnonymousLogin(false)}
      />
    </Box>
  );
};