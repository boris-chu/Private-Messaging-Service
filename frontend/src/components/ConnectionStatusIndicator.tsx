import React from 'react';
import { Box, Typography } from '@mui/material';
import { Circle } from '@mui/icons-material';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
  size?: 'small' | 'medium';
  showText?: boolean;
  variant?: 'header' | 'sidebar' | 'inline';
  className?: string;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  status,
  size = 'medium',
  showText = true,
  variant = 'inline',
  className
}) => {
  const getIndicatorSize = () => {
    switch (size) {
      case 'small': return { width: 8, height: 8, fontSize: 8 };
      case 'medium': return { width: 10, height: 10, fontSize: 10 };
      default: return { width: 10, height: 10, fontSize: 10 };
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small': return { xs: '10px', sm: '11px' };
      case 'medium': return { xs: '11px', sm: '13px' };
      default: return { xs: '11px', sm: '13px' };
    }
  };

  const getGap = () => {
    switch (size) {
      case 'small': return { xs: 0.25, sm: 0.5 };
      case 'medium': return { xs: 0.5, sm: 1.5 };
      default: return { xs: 0.5, sm: 1.5 };
    }
  };

  const getTextVisibility = () => {
    if (!showText) return 'none';
    switch (variant) {
      case 'header': return { xs: 'none', sm: 'block' }; // Hide on mobile
      case 'sidebar': return 'block'; // Always show
      case 'inline': return 'block'; // Always show
      default: return 'block';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return '#34C759'; // Green
      case 'disconnected': return '#FF3B30'; // Red
      case 'connecting': return '#FFA500'; // Orange
      default: return '#999999'; // Gray
    }
  };

  const { width, height, fontSize } = getIndicatorSize();

  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: getGap(),
        flexShrink: 0
      }}
    >
      {/* Status Indicator */}
      {status === 'connecting' ? (
        <Box
          sx={{
            width,
            height,
            border: `2px solid ${getStatusColor()}`,
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            }
          }}
          aria-label="Connecting"
        />
      ) : (
        <Circle
          sx={{
            fontSize,
            color: getStatusColor()
          }}
          aria-label={`Connection status: ${status}`}
        />
      )}

      {/* Status Text */}
      {showText && (
        <Typography
          variant="body2"
          sx={{
            fontSize: getTextSize(),
            color: 'text.secondary',
            fontWeight: 500,
            display: getTextVisibility(),
            whiteSpace: 'nowrap'
          }}
        >
          {getStatusText()}
        </Typography>
      )}
    </Box>
  );
};

export default ConnectionStatusIndicator;