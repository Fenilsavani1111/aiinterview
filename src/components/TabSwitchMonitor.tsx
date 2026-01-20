import { useEffect, useRef } from 'react';

interface TabSwitchMonitorProps {
  isActive: boolean;
  isCompleted: boolean;
  onForceComplete: (reason: string) => void;
}

const MAX_VIOLATIONS = 2; // 1st warning, 2nd terminate
const VIOLATION_RESET_MS = 1500; // window to group events

const TabSwitchMonitor: React.FC<TabSwitchMonitorProps> = ({
  isActive,
  isCompleted,
  onForceComplete,
}) => {
  const violationCountRef = useRef(0);
  const terminatedRef = useRef(false);

  // 🔐 prevents multiple counts for same action
  const violationLockedRef = useRef(false);
  const violationTimerRef = useRef<number | null>(null);

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
      // 🚫 already counted for this action
      if (violationLockedRef.current) return;

      violationLockedRef.current = true;

      violationCountRef.current += 1;

      console.warn(
        `🚨 Proctoring Violation: ${reason} | Count: ${violationCountRef.current}`
      );

      // unlock after grouping window
      violationTimerRef.current = window.setTimeout(() => {
        violationLockedRef.current = false;
      }, VIOLATION_RESET_MS);

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

    // ✅ TAB SWITCH (PRIMARY SIGNAL)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        registerViolation('TAB_SWITCH');
      }
    };

    // ✅ APP SWITCH / MINIMIZE
    const handleBlur = () => {
      // Ignore blur if tab already hidden (same incident)
      if (document.hidden) return;
      registerViolation('WINDOW_BLUR_OR_MINIMIZE');
    };

    // ✅ FULLSCREEN EXIT
    const handleFullscreenExit = () => {
      if (!document.fullscreenElement && !document.hidden) {
        registerViolation('EXIT_FULLSCREEN');
      }
    };

    // ✅ WINDOW RESIZE
    const handleResize = () => {
      // Ignore resize while tab hidden
      if (document.hidden) return;

      const { innerWidth, innerHeight } = window;
      const last = lastWindowSizeRef.current;

      if (
        Math.abs(innerWidth - last.width) > 80 ||
        Math.abs(innerHeight - last.height) > 80
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

      if (violationTimerRef.current) {
        clearTimeout(violationTimerRef.current);
      }
    };
  }, [isActive, isCompleted, onForceComplete]);

  return null;
};

export default TabSwitchMonitor;
