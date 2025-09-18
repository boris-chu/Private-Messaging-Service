import React from 'react';
import {
  Box,
  Chip,
  Typography,
  Paper,
  LinearProgress,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Security,
  Key,
  VerifiedUser,
  Warning,
  CheckCircle
} from '@mui/icons-material';
import HttpsOutlinedIcon from '@mui/icons-material/HttpsOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PrivateConnectivityRoundedIcon from '@mui/icons-material/PrivateConnectivityRounded';
import NoEncryptionOutlinedIcon from '@mui/icons-material/NoEncryptionOutlined';

export type EncryptionState =
  | 'initializing'
  | 'generating-keys'
  | 'exchanging-keys'
  | 'encrypted'
  | 'partial-encryption'
  | 'no-encryption'
  | 'error';

interface EncryptionStatusProps {
  state: EncryptionState;
  encryptedUserCount?: number;
  totalUserCount?: number;
  error?: string;
  compact?: boolean;
}

export const EncryptionStatus: React.FC<EncryptionStatusProps> = ({
  state,
  encryptedUserCount = 0,
  totalUserCount = 0,
  error,
  compact = false
}) => {
  const getStatusConfig = () => {
    switch (state) {
      case 'initializing':
        return {
          icon: <Key sx={{ fontSize: 16 }} />,
          color: 'warning' as const,
          text: 'Initializing encryption...',
          description: 'Setting up your encryption keys',
          showProgress: true
        };

      case 'generating-keys':
        return {
          icon: <Security sx={{ fontSize: 16 }} />,
          color: 'warning' as const,
          text: 'Generating keys...',
          description: 'Creating your unique encryption keys',
          showProgress: true
        };

      case 'exchanging-keys':
        return {
          icon: <PrivateConnectivityRoundedIcon sx={{ fontSize: 16, color: '#2196f3' }} />,
          color: 'info' as const,
          text: 'Exchanging keys...',
          description: 'Sharing public keys with other users',
          showProgress: true
        };

      case 'encrypted':
        return {
          icon: <PrivateConnectivityRoundedIcon sx={{ fontSize: 16, color: '#4caf50' }} />,
          color: 'success' as const,
          text: 'End-to-End Encrypted',
          description: `Secure connection with ${encryptedUserCount} user${encryptedUserCount !== 1 ? 's' : ''}`,
          showProgress: false
        };

      case 'partial-encryption':
        return {
          icon: <HttpsOutlinedIcon sx={{ fontSize: 16, color: '#ff9800' }} />,
          color: 'warning' as const,
          text: `E2E with ${encryptedUserCount}/${totalUserCount} users`,
          description: 'Some users may not support encryption',
          showProgress: false
        };

      case 'no-encryption':
        return {
          icon: <NoEncryptionOutlinedIcon sx={{ fontSize: 16, color: '#f44336' }} />,
          color: 'error' as const,
          text: 'Not Encrypted',
          description: 'Messages are sent in plain text',
          showProgress: false
        };

      case 'error':
        return {
          icon: <Warning sx={{ fontSize: 16, color: '#f44336' }} />,
          color: 'error' as const,
          text: 'Encryption Error',
          description: error || 'Failed to establish encryption',
          showProgress: false
        };

      default:
        return {
          icon: <NoEncryptionOutlinedIcon sx={{ fontSize: 16 }} />,
          color: 'default' as const,
          text: 'Unknown',
          description: 'Encryption status unknown',
          showProgress: false
        };
    }
  };

  const config = getStatusConfig();

  if (compact) {
    return (
      <Tooltip title={config.description} arrow>
        <Chip
          icon={config.icon}
          label={config.text}
          color={config.color}
          size="small"
          variant="outlined"
          sx={{
            fontWeight: 500,
            '& .MuiChip-icon': {
              color: 'inherit'
            }
          }}
        />
      </Tooltip>
    );
  }

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        bgcolor: state === 'encrypted' ? 'rgba(76, 175, 80, 0.05)' :
                state === 'error' ? 'rgba(244, 67, 54, 0.05)' :
                'background.paper',
        border: '1px solid',
        borderColor: state === 'encrypted' ? 'rgba(76, 175, 80, 0.2)' :
                    state === 'error' ? 'rgba(244, 67, 54, 0.2)' :
                    'divider'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        {config.icon}
        <Typography variant="subtitle2" fontWeight={600}>
          {config.text}
        </Typography>
        {state === 'encrypted' && (
          <VerifiedUser sx={{ fontSize: 16, color: '#4caf50', ml: 0.5 }} />
        )}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: config.showProgress ? 1 : 0 }}>
        {config.description}
      </Typography>

      {config.showProgress && (
        <LinearProgress
          sx={{
            borderRadius: 1,
            bgcolor: 'rgba(0,0,0,0.1)',
            '& .MuiLinearProgress-bar': {
              bgcolor: config.color === 'success' ? '#4caf50' :
                       config.color === 'warning' ? '#ff9800' :
                       '#2196f3'
            }
          }}
        />
      )}

      {state === 'encrypted' && encryptedUserCount > 0 && (
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CheckCircle sx={{ fontSize: 14, color: '#4caf50' }} />
          <Typography variant="caption" color="success.main">
            All messages are encrypted end-to-end
          </Typography>
        </Box>
      )}

      {state === 'partial-encryption' && (
        <Alert
          severity="warning"
          variant="outlined"
          sx={{ mt: 1, fontSize: '0.75rem' }}
        >
          Some users may receive unencrypted messages
        </Alert>
      )}

      {state === 'error' && error && (
        <Alert
          severity="error"
          variant="outlined"
          sx={{ mt: 1, fontSize: '0.75rem' }}
        >
          {error}
        </Alert>
      )}
    </Paper>
  );
};

// Message encryption indicator component
interface MessageEncryptionBadgeProps {
  isEncrypted: boolean;
  size?: 'small' | 'medium';
}

export const MessageEncryptionBadge: React.FC<MessageEncryptionBadgeProps> = ({
  isEncrypted,
  size = 'small'
}) => {
  const iconSize = size === 'small' ? 12 : 16;

  return (
    <Tooltip
      title={isEncrypted ? 'End-to-end encrypted' : 'Not encrypted'}
      arrow
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          ml: 0.5
        }}
      >
        {isEncrypted ? (
          <LockOutlinedIcon sx={{
            fontSize: iconSize,
            color: '#4caf50',
            opacity: 0.8
          }} />
        ) : (
          <NoEncryptionOutlinedIcon sx={{
            fontSize: iconSize,
            color: '#f44336',
            opacity: 0.6
          }} />
        )}
      </Box>
    </Tooltip>
  );
};

// Encryption key fingerprint display
interface KeyFingerprintProps {
  publicKey: string;
  username: string;
}

export const KeyFingerprint: React.FC<KeyFingerprintProps> = ({
  publicKey,
  username
}) => {
  // Generate a visual fingerprint from the public key
  const generateFingerprint = (key: string): string => {
    // Simple hash-like visualization (first 8 chars of base64)
    return key.substring(0, 8).toUpperCase();
  };

  const fingerprint = generateFingerprint(publicKey);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        bgcolor: 'rgba(76, 175, 80, 0.05)',
        border: '1px solid rgba(76, 175, 80, 0.2)'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Key sx={{ fontSize: 16, color: '#4caf50' }} />
        <Typography variant="subtitle2" fontWeight={600}>
          {username}'s Key
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Verify this fingerprint matches what {username} sees:
      </Typography>

      <Box
        sx={{
          p: 1,
          bgcolor: 'background.paper',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          fontFamily: 'monospace',
          textAlign: 'center'
        }}
      >
        <Typography variant="body2" fontWeight={600} letterSpacing={2}>
          {fingerprint}
        </Typography>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        Key fingerprint for verification
      </Typography>
    </Paper>
  );
};