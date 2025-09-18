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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SecurityIcon from '@mui/icons-material/Security';
import { TurnstileWidget } from '../components/TurnstileWidget';
import { apiService } from '../services/apiService';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    company: '',
    password: '',
    confirmPassword: ''
  });
  const [agreeToPolicy, setAgreeToPolicy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
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

      if (!turnstileToken) {
        setError('Please complete the verification');
        return;
      }

      const response = await apiService.register({
        username: formData.username,
        email: formData.email,
        fullName: formData.fullName,
        company: formData.company,
        password: formData.password,
        turnstileToken
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

  const isFormValid = Object.values(formData).every(value => value.trim()) &&
    formData.password === formData.confirmPassword &&
    agreeToPolicy &&
    turnstileToken;

  return (
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
        maxWidth: { xs: '100%', md: 500 },
      }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <SecurityIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
              Create Account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Join your company's secure messaging platform
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
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
              helperText="This will be your unique identifier"
              disabled={isLoading}
            />

            <TextField
              fullWidth
              label="Email"
              type="email"
              variant="outlined"
              margin="normal"
              required
              value={formData.email}
              onChange={handleInputChange('email')}
              disabled={isLoading}
            />

            <TextField
              fullWidth
              label="Full Name"
              variant="outlined"
              margin="normal"
              required
              value={formData.fullName}
              onChange={handleInputChange('fullName')}
              disabled={isLoading}
            />

            <TextField
              fullWidth
              label="Company"
              variant="outlined"
              margin="normal"
              required
              value={formData.company}
              onChange={handleInputChange('company')}
              disabled={isLoading}
            />

            <TextField
              fullWidth
              label="Password"
              type="password"
              variant="outlined"
              margin="normal"
              required
              value={formData.password}
              onChange={handleInputChange('password')}
              disabled={isLoading}
            />

            <TextField
              fullWidth
              label="Confirm Password"
              type="password"
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
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={agreeToPolicy}
                  onChange={(e) => setAgreeToPolicy(e.target.checked)}
                  required
                  disabled={isLoading}
                />
              }
              label="I agree to the security policies and terms of use"
              sx={{ mt: 2, mb: 2 }}
            />

            {/* Cloudflare Turnstile */}
            <Box sx={{ mt: 2, mb: 2 }}>
              <TurnstileWidget
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || 'demo-site-key'}
                onVerify={setTurnstileToken}
                theme="dark"
              />
            </Box>

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
                }
              }}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Link
                href="/login"
                variant="body2"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/login');
                }}
                sx={{
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
  );
};