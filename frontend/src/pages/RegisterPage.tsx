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
  Alert,
  LinearProgress,
  Chip,
  InputAdornment,
  IconButton,
  Fade,
  Zoom,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Security,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Cancel,
  Person,
  Lock,
} from '@mui/icons-material';
import { apiService } from '../services/apiService';

interface PasswordStrength {
  score: number;
  label: string;
  color: 'error' | 'warning' | 'info' | 'success';
  suggestions: string[];
}

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldValidation, setFieldValidation] = useState<Record<string, boolean>>({});
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    const suggestions: string[] = [];

    if (password.length === 0) {
      return { score: 0, label: '', color: 'error', suggestions: [] };
    }

    // Length check
    if (password.length >= 8) score += 1;
    else suggestions.push('Use at least 8 characters');

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    else suggestions.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else suggestions.push('Add uppercase letters');

    if (/\d/.test(password)) score += 1;
    else suggestions.push('Add numbers');

    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    else suggestions.push('Add special characters');

    // Extra points for length
    if (password.length >= 12) score += 1;

    const strengthMap = {
      0: { label: 'Very Weak', color: 'error' as const },
      1: { label: 'Very Weak', color: 'error' as const },
      2: { label: 'Weak', color: 'error' as const },
      3: { label: 'Fair', color: 'warning' as const },
      4: { label: 'Good', color: 'info' as const },
      5: { label: 'Strong', color: 'success' as const },
      6: { label: 'Very Strong', color: 'success' as const },
    };

    const strength = strengthMap[score as keyof typeof strengthMap];
    return { score, ...strength, suggestions };
  };

  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameAvailable(null);
      return;
    }

    setUsernameCheckLoading(true);
    try {
      await apiService.getUser(username);
      // If we get a response, user exists
      setUsernameAvailable(false);
    } catch {
      // If we get an error (like 404), username is available
      setUsernameAvailable(true);
    } finally {
      setUsernameCheckLoading(false);
    }
  };

  const validateField = (field: string, value: string): boolean => {
    switch (field) {
      case 'username':
        return value.length >= 3 && /^[a-zA-Z0-9_]+$/.test(value) && usernameAvailable === true;
      case 'password':
        return calculatePasswordStrength(value).score >= 3;
      case 'confirmPassword':
        return value === formData.password && value.length > 0;
      default:
        return true;
    }
  };

  // Debounce username checking
  React.useEffect(() => {
    if (formData.username.length >= 3) {
      setUsernameAvailable(null);
      const timeoutId = setTimeout(() => {
        checkUsernameAvailability(formData.username);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setUsernameAvailable(null);
    }
  }, [formData.username]);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'username') {
      setUsernameAvailable(null);
    }

    // Update field validation for non-username fields immediately
    if (field !== 'username' && value) {
      setFieldValidation(prev => ({
        ...prev,
        [field]: validateField(field, value)
      }));
    } else if (field !== 'username') {
      setFieldValidation(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (!usernameAvailable) {
        setError('Username is not available');
        return;
      }

      const response = await apiService.register({
        username: formData.username,
        password: formData.password,
      });

      if (response.success) {
        navigate('/login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid =
    formData.username.trim() &&
    formData.password.trim() &&
    formData.confirmPassword.trim() &&
    formData.password === formData.confirmPassword &&
    usernameAvailable === true &&
    fieldValidation.password === true;

  const passwordStrength = calculatePasswordStrength(formData.password);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0d1117', color: '#e6edf3' }}>
      <Container maxWidth="sm" sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, md: 3 },
        py: { xs: 4, md: 4 }
      }}>
        <Card sx={{
          width: '100%',
          maxWidth: { xs: '100%', md: 450 },
          bgcolor: '#161b22',
          border: '1px solid #30363d',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Zoom in timeout={800}>
                <Security sx={{
                  fontSize: 48,
                  color: '#00d4aa',
                  mb: 2,
                  filter: 'drop-shadow(0 0 10px rgba(0, 212, 170, 0.3))'
                }} />
              </Zoom>
              <Typography variant="h4" component="h1" gutterBottom sx={{
                fontSize: { xs: '1.75rem', md: '2rem' },
                fontWeight: 600,
                color: '#e6edf3'
              }}>
                Join Axol Chat
              </Typography>
              <Typography variant="body2" sx={{ color: '#8b949e' }}>
                Axol — private talk, under the shell.
              </Typography>
            </Box>

            {error && (
              <Fade in timeout={300}>
                <Alert severity="error" sx={{
                  mb: 3,
                  bgcolor: 'rgba(248, 81, 73, 0.1)',
                  border: '1px solid rgba(248, 81, 73, 0.3)',
                  color: '#f85149'
                }}>
                  {error}
                </Alert>
              </Fade>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Username"
                variant="outlined"
                margin="normal"
                required
                value={formData.username}
                onChange={handleInputChange('username')}
                disabled={isLoading}
                helperText="Letters, numbers, and underscores only"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person sx={{ color: '#8b949e' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      {usernameCheckLoading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" sx={{ color: '#8b949e' }}>Checking...</Typography>
                        </Box>
                      ) : usernameAvailable === true ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CheckCircle sx={{ color: '#00d4aa', fontSize: 20 }} />
                          <Typography variant="caption" sx={{ color: '#00d4aa' }}>Available</Typography>
                        </Box>
                      ) : usernameAvailable === false ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Cancel sx={{ color: '#f85149', fontSize: 20 }} />
                          <Typography variant="caption" sx={{ color: '#f85149' }}>Taken</Typography>
                        </Box>
                      ) : null}
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#0d1117',
                    '& fieldset': { borderColor: '#30363d' },
                    '&:hover fieldset': { borderColor: '#58a6ff' },
                    '&.Mui-focused fieldset': { borderColor: '#00d4aa' },
                  },
                  '& .MuiInputLabel-root': { color: '#8b949e' },
                  '& .MuiInputBase-input': { color: '#e6edf3' },
                  '& .MuiFormHelperText-root': { color: '#8b949e' },
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                margin="normal"
                required
                value={formData.password}
                onChange={handleInputChange('password')}
                disabled={isLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: '#8b949e' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: '#8b949e' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#0d1117',
                    '& fieldset': { borderColor: '#30363d' },
                    '&:hover fieldset': { borderColor: '#58a6ff' },
                    '&.Mui-focused fieldset': { borderColor: '#00d4aa' },
                  },
                  '& .MuiInputLabel-root': { color: '#8b949e' },
                  '& .MuiInputBase-input': { color: '#e6edf3' },
                }}
              />

              {/* Password Strength Indicator */}
              {formData.password && (
                <Box sx={{ mt: 1, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#8b949e' }}>
                      Password Strength:
                    </Typography>
                    <Chip
                      label={passwordStrength.label}
                      size="small"
                      color={passwordStrength.color}
                      variant="outlined"
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(passwordStrength.score / 6) * 100}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      bgcolor: '#30363d',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: passwordStrength.color === 'success' ? '#00d4aa' :
                                passwordStrength.color === 'info' ? '#58a6ff' :
                                passwordStrength.color === 'warning' ? '#d29922' : '#f85149'
                      }
                    }}
                  />
                  {passwordStrength.suggestions.length > 0 && (
                    <Typography variant="caption" sx={{ color: '#8b949e', mt: 0.5, display: 'block' }}>
                      Suggestions: {passwordStrength.suggestions.join(', ')}
                    </Typography>
                  )}
                </Box>
              )}

              <TextField
                fullWidth
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                variant="outlined"
                margin="normal"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                disabled={isLoading}
                error={formData.confirmPassword !== '' && formData.password !== formData.confirmPassword}
                helperText={
                  formData.confirmPassword !== '' && formData.password !== formData.confirmPassword
                    ? 'Passwords do not match'
                    : ''
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: '#8b949e' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      {fieldValidation.confirmPassword ? (
                        <CheckCircle sx={{ color: '#00d4aa', fontSize: 20 }} />
                      ) : formData.confirmPassword !== '' && formData.password !== formData.confirmPassword ? (
                        <Cancel sx={{ color: '#f85149', fontSize: 20 }} />
                      ) : (
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                          sx={{ color: '#8b949e' }}
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      )}
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#0d1117',
                    '& fieldset': { borderColor: '#30363d' },
                    '&:hover fieldset': { borderColor: '#58a6ff' },
                    '&.Mui-focused fieldset': { borderColor: '#00d4aa' },
                  },
                  '& .MuiInputLabel-root': { color: '#8b949e' },
                  '& .MuiInputBase-input': { color: '#e6edf3' },
                  '& .MuiFormHelperText-root': { color: '#f85149' },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={!isFormValid || isLoading}
                sx={{
                  mt: 4,
                  mb: 2,
                  bgcolor: '#00d4aa',
                  color: '#0d1117',
                  fontWeight: 600,
                  minHeight: 48,
                  '&:hover': {
                    bgcolor: '#00b894',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 20px rgba(0, 212, 170, 0.4)',
                  },
                  '&:active': { transform: 'translateY(0)' },
                  '&.Mui-disabled': { bgcolor: '#30363d', color: '#8b949e' }
                }}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Link
                  href="/login"
                  variant="body2"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/login');
                  }}
                  sx={{
                    color: '#58a6ff',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  Already have an account? Sign in
                </Link>
              </Box>
            </Box>
        </CardContent>
      </Card>
      </Container>
    </Box>
  );
};