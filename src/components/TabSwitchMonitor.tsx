import { useEffect, useRef } from 'react';

interface TabSwitchMonitorProps {
  isActive: boolean;
  isCompleted: boolean;
  onForceComplete: (reason: string) => void;
}

const MAX_VIOLATIONS = 2; // 1st warning, 2nd terminate
const COOLDOWN_MS = 1000;

const TabSwitchMonitor: React.FC<TabSwitchMonitorProps> = ({
  isActive,
  isCompleted,
  onForceComplete,
}) => {
  const violationCountRef = useRef(0);
  const terminatedRef = useRef(false);
  const lastViolationTimeRef = useRef(0);
  const lastWindowSizeRef = useRef({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    if (!isActive || isCompleted) return;

    const terminateAssessment = (reason: string) => {
      if (terminatedRef.current) return;

      terminatedRef.current = true;

      alert(
        '❌ Interview Ended\n\n' +
        'You changed tab, application, or window state during the interview.\n' +
        'Your interview has been automatically submitted.'
      );

      onForceComplete(reason);
    };

    const registerViolation = (reason: string) => {
      const now = Date.now();

      // 🛡️ Prevent duplicate triggers
      if (now - lastViolationTimeRef.current < COOLDOWN_MS) return;

      lastViolationTimeRef.current = now;
      violationCountRef.current += 1;

      console.warn(
        `🚨 Proctoring Violation: ${reason} | Count: ${violationCountRef.current}`
      );
      console.log('violationCountRef.current=-=-=--=--=', violationCountRef.current, MAX_VIOLATIONS);
      console.log('reason=-=-=--=--=', reason);
      if (violationCountRef.current >= MAX_VIOLATIONS) {
        terminateAssessment(reason);
      } else {
        alert(
          '⚠️ Warning!\n\n' +
          'Switching tabs, minimizing, or resizing the window is not allowed.\n' +
          'Next violation will end your interview.'
        );
      }
    };

    // 🔴 TAB SWITCH
    const handleVisibilityChange = () => {
      if (document.hidden) registerViolation('TAB_SWITCH');
    };

    // 🔴 APP SWITCH / ALT+TAB / MINIMIZE
    const handleBlur = () => {
      registerViolation('WINDOW_BLUR_OR_MINIMIZE');
    };

    // 🔴 FULLSCREEN EXIT
    const handleFullscreenExit = () => {
      if (!document.fullscreenElement) {
        registerViolation('EXIT_FULLSCREEN');
      }
    };

    // 🔴 WINDOW RESIZE
    const handleResize = () => {
      const { innerWidth, innerHeight } = window;
      const last = lastWindowSizeRef.current;

      // Ignore very small changes (scrollbar, OS UI)
      if (
        Math.abs(innerWidth - last.width) > 50 ||
        Math.abs(innerHeight - last.height) > 50
      ) {
        registerViolation('WINDOW_RESIZE');
      }

      lastWindowSizeRef.current = {
        width: innerWidth,
        height: innerHeight,
      };
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenExit);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenExit);
      window.removeEventListener('resize', handleResize);
    };
  }, [isActive, isCompleted, onForceComplete]);

  return null;
};

export default TabSwitchMonitor;
