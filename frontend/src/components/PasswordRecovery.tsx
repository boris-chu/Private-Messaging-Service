import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Paper
} from '@mui/material';
import {
  Key,
  Security,
  CheckCircle
} from '@mui/icons-material';

interface PasswordRecoveryProps {
  open: boolean;
  onClose: () => void;
  onRecoveryComplete: () => void;
}

export const PasswordRecovery: React.FC<PasswordRecoveryProps> = ({
  open,
  onClose,
  onRecoveryComplete
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [recoveryMethod, setRecoveryMethod] = useState<'phrase' | 'code' | null>(null);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const steps = ['Choose Recovery Method', 'Enter Recovery Data', 'Set New Password'];

  const handleClose = () => {
    setActiveStep(0);
    setRecoveryMethod(null);
    setRecoveryInput('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  };

  const validateRecoveryInput = (): boolean => {
    if (recoveryMethod === 'phrase') {
      const words = recoveryInput.trim().split(/\s+/);
      if (words.length !== 12) {
        setError('Recovery phrase must be exactly 12 words');
        return false;
      }

      // Check against stored recovery phrase
      const storedPhrase = localStorage.getItem('recovery-phrase');
      if (storedPhrase) {
        const stored = JSON.parse(storedPhrase);
        if (words.join(' ').toLowerCase() !== stored.join(' ').toLowerCase()) {
          setError('Invalid recovery phrase');
          return false;
        }
      } else {
        setError('No recovery phrase found for this account');
        return false;
      }
    } else if (recoveryMethod === 'code') {
      const code = recoveryInput.trim().toUpperCase();
      if (code.length !== 8) {
        setError('Recovery code must be 8 characters');
        return false;
      }

      // Check against stored recovery codes
      const storedCodes = localStorage.getItem('recovery-codes');
      if (storedCodes) {
        const codes = JSON.parse(storedCodes);
        if (!codes.includes(code)) {
          setError('Invalid or already used recovery code');
          return false;
        }
      } else {
        setError('No recovery codes found for this account');
        return false;
      }
    }

    setError('');
    return true;
  };

  const validatePassword = (): boolean => {
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = async () => {
    setIsProcessing(true);

    try {
      if (activeStep === 0) {
        // Move to recovery input step
        setActiveStep(1);
      } else if (activeStep === 1) {
        // Validate recovery input
        if (!validateRecoveryInput()) {
          setIsProcessing(false);
          return;
        }
        setActiveStep(2);
      } else if (activeStep === 2) {
        // Validate new password and complete recovery
        if (!validatePassword()) {
          setIsProcessing(false);
          return;
        }

        // Simulate password reset
        await new Promise(resolve => setTimeout(resolve, 2000));

        // If using a recovery code, mark it as used
        if (recoveryMethod === 'code') {
          const storedCodes = localStorage.getItem('recovery-codes');
          if (storedCodes) {
            const codes = JSON.parse(storedCodes);
            const usedCode = recoveryInput.trim().toUpperCase();
            const updatedCodes = codes.filter((code: string) => code !== usedCode);
            localStorage.setItem('recovery-codes', JSON.stringify(updatedCodes));
          }
        }

        onRecoveryComplete();
        handleClose();
      }
    } catch {
      setError('Recovery failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
      setError('');
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Account Recovery</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 && (
            <Box>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Choose your recovery method to regain access to your account:
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Paper
                  sx={{
                    p: 3,
                    border: '2px solid',
                    borderColor: recoveryMethod === 'phrase' ? 'primary.main' : 'divider',
                    cursor: 'pointer',
                    bgcolor: recoveryMethod === 'phrase' ? 'action.selected' : 'background.paper'
                  }}
                  onClick={() => setRecoveryMethod('phrase')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Key sx={{ color: 'primary.main' }} />
                    <Typography variant="h6">Recovery Phrase</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Use your 12-word recovery phrase to restore account access
                  </Typography>
                </Paper>

                <Paper
                  sx={{
                    p: 3,
                    border: '2px solid',
                    borderColor: recoveryMethod === 'code' ? 'primary.main' : 'divider',
                    cursor: 'pointer',
                    bgcolor: recoveryMethod === 'code' ? 'action.selected' : 'background.paper'
                  }}
                  onClick={() => setRecoveryMethod('code')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Security sx={{ color: 'primary.main' }} />
                    <Typography variant="h6">Recovery Code</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Use one of your 8-character recovery codes (each can only be used once)
                  </Typography>
                </Paper>
              </Box>
            </Box>
          )}

          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                {recoveryMethod === 'phrase' ? <Key /> : <Security />}
                Enter Your {recoveryMethod === 'phrase' ? 'Recovery Phrase' : 'Recovery Code'}
              </Typography>

              {recoveryMethod === 'phrase' ? (
                <TextField
                  label="Recovery Phrase"
                  placeholder="Enter your 12-word recovery phrase separated by spaces"
                  value={recoveryInput}
                  onChange={(e) => {
                    setRecoveryInput(e.target.value);
                    if (error) setError('');
                  }}
                  fullWidth
                  multiline
                  rows={3}
                  helperText="Example: abandon ability about action actor address..."
                  sx={{ mb: 2 }}
                />
              ) : (
                <TextField
                  label="Recovery Code"
                  placeholder="Enter 8-character recovery code"
                  value={recoveryInput}
                  onChange={(e) => {
                    setRecoveryInput(e.target.value.toUpperCase());
                    if (error) setError('');
                  }}
                  fullWidth
                  inputProps={{ maxLength: 8 }}
                  helperText="Example: A1B2C3D4"
                  sx={{ mb: 2, '& input': { fontFamily: 'monospace' } }}
                />
              )}

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Box>
          )}

          {activeStep === 2 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CheckCircle sx={{ color: 'success.main' }} />
                <Typography variant="h6">Recovery Verified!</Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Now set a new secure password for your account:
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError('');
                  }}
                  fullWidth
                  required
                  helperText="Must be at least 8 characters with uppercase, lowercase, and number"
                />

                <TextField
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError('');
                  }}
                  fullWidth
                  required
                />

                {error && (
                  <Alert severity="error">
                    {error}
                  </Alert>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isProcessing}>
          Cancel
        </Button>
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={isProcessing}>
            Back
          </Button>
        )}
        <Button
          onClick={handleNext}
          variant="contained"
          disabled={
            isProcessing ||
            (activeStep === 0 && !recoveryMethod) ||
            (activeStep === 1 && !recoveryInput.trim()) ||
            (activeStep === 2 && (!newPassword || !confirmPassword))
          }
          startIcon={isProcessing ? <CircularProgress size={16} /> : null}
        >
          {isProcessing ? 'Processing...' : activeStep === 2 ? 'Reset Password' : 'Next'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};