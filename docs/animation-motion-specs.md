# Animation & Motion Design Specifications

## 🎬 Motion Design Philosophy

### Smooth, Purposeful Animations
- **Performance-First**: 60fps animations using CSS transforms and opacity
- **Meaningful Motion**: Each animation serves a functional purpose
- **Reduced Motion**: Respect user accessibility preferences
- **Smooth Transitions**: Seamless flow between states and pages
- **Micro-Interactions**: Delightful feedback for user actions

### Animation Principles
- **Easing**: Natural, physics-inspired timing functions
- **Duration**: Quick but not jarring (200-500ms)
- **Staggering**: Elegant entrance/exit of multiple elements
- **Consistency**: Unified animation language throughout app

## 📱 Message Animation System

### Incoming Message Animations
```tsx
// Smooth message appearance with spring animation
import { useSpring, animated, useTransition } from '@react-spring/web';

export const AnimatedMessage: React.FC<{ message: Message; isOwn: boolean }> = ({
  message,
  isOwn
}) => {
  const slideIn = useSpring({
    from: {
      opacity: 0,
      transform: isOwn ? 'translateX(100px)' : 'translateX(-100px)',
      scale: 0.8
    },
    to: {
      opacity: 1,
      transform: 'translateX(0px)',
      scale: 1
    },
    config: { tension: 300, friction: 30 }
  });

  const typingIndicator = useSpring({
    from: { width: 0 },
    to: { width: message.content.length * 8 },
    config: { duration: message.content.length * 50 }
  });

  return (
    <animated.div style={slideIn}>
      <Paper sx={{
        p: 2,
        mb: 1,
        maxWidth: '70%',
        ml: isOwn ? 'auto' : 0,
        mr: isOwn ? 0 : 'auto',
        bgcolor: isOwn ? 'primary.main' : 'background.paper',
        borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        transform: 'translateZ(0)', // Enable hardware acceleration
      }}>
        <animated.div style={typingIndicator}>
          <Typography variant="body1">
            {message.content}
          </Typography>
        </animated.div>
        <Typography variant="caption" color="text.secondary">
          {format(message.timestamp, 'HH:mm')}
        </Typography>
      </Paper>
    </animated.div>
  );
};
```

### Message List Animations
```tsx
// Staggered message list with virtualization
export const AnimatedMessageList: React.FC<{ messages: Message[] }> = ({ messages }) => {
  const transitions = useTransition(messages, {
    from: { opacity: 0, transform: 'translateY(20px)' },
    enter: { opacity: 1, transform: 'translateY(0px)' },
    leave: { opacity: 0, transform: 'translateY(-20px)' },
    trail: 50, // Stagger animation by 50ms
    config: { tension: 400, friction: 40 }
  });

  return (
    <Box sx={{
      height: '100%',
      overflow: 'hidden',
      '& > div': {
        willChange: 'transform, opacity' // Optimize for animations
      }
    }}>
      {transitions((style, message) => (
        <animated.div style={style}>
          <AnimatedMessage message={message} isOwn={message.isOwn} />
        </animated.div>
      ))}
    </Box>
  );
};
```

### Typing Indicator Animation
```tsx
// Smooth typing indicator with bouncing dots
export const TypingIndicator: React.FC<{ isVisible: boolean; username: string }> = ({
  isVisible,
  username
}) => {
  const animation = useSpring({
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0px)' : 'translateY(10px)',
    config: { tension: 300, friction: 25 }
  });

  const dots = useSpring({
    loop: true,
    reset: true,
    from: { transform: 'scale(1)' },
    to: [
      { transform: 'scale(1.2)' },
      { transform: 'scale(1)' }
    ],
    config: { duration: 600 }
  });

  return (
    <animated.div style={animation}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        p: 1,
        bgcolor: 'background.paper',
        borderRadius: 2,
        ml: 1
      }}>
        <Typography variant="caption" sx={{ mr: 1 }}>
          {username} is typing
        </Typography>
        <animated.div style={dots}>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  animation: `bounce 1.4s infinite ease-in-out both`,
                  animationDelay: `${i * 0.16}s`,
                  '@keyframes bounce': {
                    '0%, 80%, 100%': {
                      transform: 'scale(0)'
                    },
                    '40%': {
                      transform: 'scale(1)'
                    }
                  }
                }}
              />
            ))}
          </Box>
        </animated.div>
      </Box>
    </animated.div>
  );
};
```

## 🖥️ Terminal Animation Effects

### Terminal Text Animation
```tsx
// Typewriter effect for terminal output
export const TypewriterText: React.FC<{ text: string; speed?: number }> = ({
  text,
  speed = 30
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return (
    <Typography
      component="span"
      sx={{
        fontFamily: 'monospace',
        '&::after': {
          content: '"|"',
          animation: 'blink 1s infinite',
          '@keyframes blink': {
            '0%, 50%': { opacity: 1 },
            '51%, 100%': { opacity: 0 }
          }
        }
      }}
    >
      {displayText}
    </Typography>
  );
};
```

### Command Execution Animation
```tsx
// Smooth command execution with loading states
export const AnimatedCommand: React.FC<{
  command: string;
  onExecute: () => Promise<string>;
}> = ({ command, onExecute }) => {
  const [status, setStatus] = useState<'idle' | 'executing' | 'completed'>('idle');
  const [result, setResult] = useState<string>('');

  const commandAnimation = useSpring({
    transform: status === 'executing' ? 'scale(1.02)' : 'scale(1)',
    background: status === 'executing'
      ? 'linear-gradient(90deg, #00d4aa20 0%, #00d4aa40 50%, #00d4aa20 100%)'
      : 'transparent',
    config: { tension: 300, friction: 30 }
  });

  const progressAnimation = useSpring({
    width: status === 'executing' ? '100%' : '0%',
    config: { duration: 1000 }
  });

  const handleExecute = async () => {
    setStatus('executing');
    try {
      const output = await onExecute();
      setResult(output);
      setStatus('completed');
    } catch (error) {
      setStatus('idle');
    }
  };

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden' }}>
      <animated.div style={commandAnimation}>
        <Typography
          sx={{
            fontFamily: 'monospace',
            p: 1,
            cursor: 'pointer',
            borderRadius: 1
          }}
          onClick={handleExecute}
        >
          $ {command}
        </Typography>
      </animated.div>

      {status === 'executing' && (
        <animated.div
          style={{
            ...progressAnimation,
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: 2,
            background: 'linear-gradient(90deg, #00d4aa, #ff6b35)',
            borderRadius: 1
          }}
        />
      )}

      {status === 'completed' && (
        <Collapse in timeout={300}>
          <TypewriterText text={result} />
        </Collapse>
      )}
    </Box>
  );
};
```

## 🎨 UI Transition Animations

### Page Transitions
```tsx
// Smooth page transitions with React Router
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

export const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  const pageVariants = {
    initial: {
      opacity: 0,
      x: '-100vw',
      scale: 0.8
    },
    in: {
      opacity: 1,
      x: 0,
      scale: 1
    },
    out: {
      opacity: 0,
      x: '100vw',
      scale: 1.2
    }
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.5
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        style={{ height: '100vh' }}
      >
        <Routes location={location}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/terminal" element={<TerminalPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};
```

### Modal and Dialog Animations
```tsx
// Smooth modal animations with backdrop blur
export const AnimatedModal: React.FC<ModalProps> = ({ open, children, ...props }) => {
  const backdropAnimation = useSpring({
    opacity: open ? 1 : 0,
    backdropFilter: open ? 'blur(8px)' : 'blur(0px)',
    config: { tension: 300, friction: 35 }
  });

  const modalAnimation = useSpring({
    transform: open ? 'scale(1) translateY(0px)' : 'scale(0.8) translateY(-50px)',
    opacity: open ? 1 : 0,
    config: { tension: 400, friction: 30 }
  });

  return (
    <Modal {...props} open={open}>
      <animated.div style={backdropAnimation}>
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2
        }}>
          <animated.div style={modalAnimation}>
            {children}
          </animated.div>
        </Box>
      </animated.div>
    </Modal>
  );
};
```

## 🔄 Loading and State Animations

### Connection Status Animation
```tsx
// Smooth connection status indicators
export const ConnectionStatus: React.FC<{ status: 'connecting' | 'connected' | 'disconnected' }> = ({
  status
}) => {
  const pulseAnimation = useSpring({
    loop: status === 'connecting',
    from: { scale: 1, opacity: 0.7 },
    to: { scale: 1.2, opacity: 1 },
    config: { duration: 1000 }
  });

  const colorAnimation = useSpring({
    backgroundColor:
      status === 'connected' ? '#4caf50' :
      status === 'connecting' ? '#ff9800' :
      '#f44336',
    config: { tension: 300, friction: 30 }
  });

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <animated.div
        style={{
          ...colorAnimation,
          ...(status === 'connecting' ? pulseAnimation : {}),
          width: 12,
          height: 12,
          borderRadius: '50%'
        }}
      />
      <Typography variant="caption">
        {status === 'connected' && 'Connected'}
        {status === 'connecting' && 'Connecting...'}
        {status === 'disconnected' && 'Disconnected'}
      </Typography>
    </Box>
  );
};
```

### Message Send Animation
```tsx
// Animated message sending with progress
export const MessageSender: React.FC = () => {
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');

  const sendAnimation = useSpring({
    transform: isSending ? 'scale(0.95)' : 'scale(1)',
    config: { tension: 400, friction: 30 }
  });

  const progressAnimation = useSpring({
    width: isSending ? '100%' : '0%',
    config: { duration: 800 }
  });

  const handleSend = async () => {
    setIsSending(true);
    try {
      await sendMessage(message);
      setMessage('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <animated.div style={sendAnimation}>
        <TextField
          fullWidth
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={isSending}
          InputProps={{
            endAdornment: (
              <IconButton
                onClick={handleSend}
                disabled={!message.trim() || isSending}
                sx={{
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.1)'
                  }
                }}
              >
                <SendIcon />
              </IconButton>
            )
          }}
        />
      </animated.div>

      {isSending && (
        <animated.div
          style={{
            ...progressAnimation,
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: 2,
            backgroundColor: '#00d4aa',
            borderRadius: 1
          }}
        />
      )}
    </Box>
  );
};
```

## 🎯 Performance Optimizations

### CSS-Based Animations for 60fps
```css
/* Optimized CSS animations for smooth performance */
@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateX(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes messageFadeOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}

.message-enter {
  animation: messageSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.message-exit {
  animation: messageFadeOut 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hardware acceleration for smooth animations */
.animated-element {
  will-change: transform, opacity;
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* Smooth scrolling for message list */
.message-container {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}
```

### Reduced Motion Support
```tsx
// Respect user motion preferences
export const useReducedMotion = () => {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  return {
    duration: prefersReducedMotion ? 0 : 300,
    config: prefersReducedMotion
      ? { duration: 0 }
      : { tension: 300, friction: 30 }
  };
};

// Apply reduced motion conditionally
export const ConditionalAnimation: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { config } = useReducedMotion();

  const animation = useSpring({
    from: { opacity: 0 },
    to: { opacity: 1 },
    config
  });

  return (
    <animated.div style={animation}>
      {children}
    </animated.div>
  );
};
```

## 📱 Mobile-Specific Animations

### Touch Feedback Animations
```tsx
// Haptic feedback with visual animation
export const TouchButton: React.FC<ButtonProps> = ({ children, onClick, ...props }) => {
  const [pressed, setPressed] = useState(false);
  const { lightTap } = useHapticFeedback();

  const pressAnimation = useSpring({
    transform: pressed ? 'scale(0.95)' : 'scale(1)',
    config: { tension: 400, friction: 25 }
  });

  const handlePress = () => {
    setPressed(true);
    lightTap();
    setTimeout(() => setPressed(false), 150);
  };

  return (
    <animated.div style={pressAnimation}>
      <Button
        {...props}
        onMouseDown={handlePress}
        onTouchStart={handlePress}
        onClick={onClick}
        sx={{
          transition: 'all 0.2s ease',
          '&:active': {
            transform: 'scale(0.95)'
          }
        }}
      >
        {children}
      </Button>
    </animated.div>
  );
};
```

This comprehensive animation system creates a smooth, delightful messaging experience that feels natural and responsive across all devices while maintaining excellent performance!