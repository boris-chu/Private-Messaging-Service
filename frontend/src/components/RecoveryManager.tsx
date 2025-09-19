import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Security,
  Key,
  Download,
  Refresh,
  ContentCopy,
  CheckCircle,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import {
  generateSecureRecoveryPhrase,
  generateSecureRecoveryCodes,
  createRecoveryBlob
} from '../utils/recoveryUtils';
import { apiService } from '../services/apiService';

interface RecoveryManagerProps {
  username: string;
  onRecoveryGenerated?: (phrase: string[], codes: string[]) => void;
}

export const RecoveryManager: React.FC<RecoveryManagerProps> = ({
  username,
  onRecoveryGenerated
}) => {
  const [recoveryPhrase, setRecoveryPhrase] = useState<string[]>([]);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showPhrase, setShowPhrase] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Check if recovery options already exist
  useEffect(() => {
    const existingPhrase = localStorage.getItem('recovery-phrase');
    const existingCodes = localStorage.getItem('recovery-codes');

    if (existingPhrase && existingCodes) {
      try {
        setRecoveryPhrase(JSON.parse(existingPhrase));
        setRecoveryCodes(JSON.parse(existingCodes));
        setHasGenerated(true);
      } catch (error) {
        console.error('Failed to load existing recovery data:', error);
      }
    }
  }, []);

  const generateNewRecovery = async () => {
    setIsGenerating(true);

    // Simulate async generation for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newPhrase = generateSecureRecoveryPhrase(12);
    const newCodes = generateSecureRecoveryCodes(8, 8);

    try {
      // Save to backend
      await apiService.saveRecoveryData({
        username,
        recoveryPhrase: newPhrase,
        recoveryCodes: newCodes
      });

      console.log('Recovery data saved successfully to backend');
    } catch (error) {
      console.error('Failed to save recovery data to backend:', error);
      // Continue anyway - recovery keys are still useful even if not saved to backend
    }

    setRecoveryPhrase(newPhrase);
    setRecoveryCodes(newCodes);
    setHasGenerated(true);
    setShowPhrase(true);
    setShowCodes(true);

    // Store in localStorage for session
    localStorage.setItem('recovery-phrase', JSON.stringify(newPhrase));
    localStorage.setItem('recovery-codes', JSON.stringify(newCodes));

    // Notify parent component
    onRecoveryGenerated?.(newPhrase, newCodes);

    setIsGenerating(false);
  };

  const handleCopyPhrase = () => {
    navigator.clipboard.writeText(recoveryPhrase.join(' '));
    setCopied({ ...copied, phrase: true });
    setTimeout(() => setCopied({ ...copied, phrase: false }), 2000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied({ ...copied, [code]: true });
    setTimeout(() => setCopied({ ...copied, [code]: false }), 2000);
  };

  const handleDownload = () => {
    const blob = createRecoveryBlob(username, recoveryPhrase, recoveryCodes);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axol-recovery-${username}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Security sx={{ color: 'primary.main' }} />
          Recovery Options
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Secure account recovery without email or phone number
        </Typography>
      </Box>

      {/* Security Info */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          Secure Recovery Options
        </Typography>
        <Typography variant="body2">
          • Recovery phrase: 12 random words that can restore your account
          • Recovery codes: 8 single-use backup codes for account access
          • Store these securely offline - they cannot be recovered if lost
          • Never share your recovery options with anyone
        </Typography>
      </Alert>

      {!hasGenerated && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Generate recovery options to secure your account
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={isGenerating ? null : <Key />}
            onClick={generateNewRecovery}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Generating Secure Recovery...
              </>
            ) : (
              'Generate Recovery Options'
            )}
          </Button>
        </Box>
      )}

      {hasGenerated && (
        <>
          {/* Recovery Phrase Section */}
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Key sx={{ color: 'primary.main' }} />
                Recovery Phrase
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title={showPhrase ? 'Hide phrase' : 'Show phrase'}>
                  <IconButton onClick={() => setShowPhrase(!showPhrase)} size="small">
                    {showPhrase ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Copy phrase">
                  <IconButton onClick={handleCopyPhrase} size="small">
                    {copied.phrase ? <CheckCircle color="success" /> : <ContentCopy />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              12-word recovery phrase for account restoration
            </Typography>

            {showPhrase ? (
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(4, 1fr)'
                },
                gap: 1
              }}>
                {recoveryPhrase.map((word, index) => (
                  <Chip
                    key={index}
                    label={`${index + 1}. ${word}`}
                    variant="outlined"
                    sx={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      fontFamily: 'monospace',
                      fontSize: '0.9rem'
                    }}
                  />
                ))}
              </Box>
            ) : (
              <Box sx={{ py: 3, textAlign: 'center', bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Click the eye icon to reveal your recovery phrase
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Recovery Codes Section */}
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Security sx={{ color: 'primary.main' }} />
                Recovery Codes
              </Typography>
              <Tooltip title={showCodes ? 'Hide codes' : 'Show codes'}>
                <IconButton onClick={() => setShowCodes(!showCodes)} size="small">
                  {showCodes ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </Tooltip>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              8 single-use backup codes for emergency access
            </Typography>

            {showCodes ? (
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(1, 1fr)',
                  sm: 'repeat(2, 1fr)'
                },
                gap: 1
              }}>
                {recoveryCodes.map((code, index) => (
                  <Paper
                    key={index}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      bgcolor: 'grey.50'
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.95rem',
                        fontWeight: 500
                      }}
                    >
                      {code}
                    </Typography>
                    <Tooltip title="Copy code">
                      <IconButton onClick={() => handleCopyCode(code)} size="small">
                        {copied[code] ? <CheckCircle color="success" fontSize="small" /> : <ContentCopy fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Box sx={{ py: 3, textAlign: 'center', bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Click the eye icon to reveal your recovery codes
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleDownload}
            >
              Download Recovery File
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={generateNewRecovery}
            >
              Generate New Options
            </Button>
          </Box>

          {/* Warning */}
          <Alert severity="warning" sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Important: Save these recovery options immediately!
            </Typography>
            <Typography variant="body2">
              Store them securely offline. If you lose your password and these recovery options,
              you will permanently lose access to your account.
            </Typography>
          </Alert>
        </>
      )}
    </Box>
  );
};

// Import the missing CircularProgress
import { CircularProgress } from '@mui/material';