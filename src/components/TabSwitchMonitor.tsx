import React, { useEffect, useRef } from 'react';

interface TabSwitchMonitorProps {
  isActive: boolean; // Enable monitoring
  isCompleted: boolean; // Stop monitoring after completion
  onForceComplete: (reason: string) => void; // Auto-submit / end exam
}

const MAX_VIOLATIONS = 1; // 🔥 STRICT MODE (change to 2 or 3 if needed)

const TabSwitchMonitor: React.FC<TabSwitchMonitorProps> = ({
  isActive,
  isCompleted,
  onForceComplete,
}) => {
  const violationCountRef = useRef<number>(0);
  const terminatedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isActive || isCompleted) return;

    const terminateAssessment = (reason: string) => {
      if (terminatedRef.current) return;

      terminatedRef.current = true;

      alert(
        '❌ Assessment Ended\n\n' +
          'You switched tabs or applications during the assessment.\n' +
          'As per rules, your assessment has been automatically submitted.'
      );

      onForceComplete(reason);
    };

    const registerViolation = (reason: string) => {
      violationCountRef.current += 1;

      console.warn(
        `🚨 Proctoring violation detected: ${reason} | Count: ${violationCountRef.current}`
      );

      sessionStorage.setItem(
        'interview_tab_switch_count',
        violationCountRef.current.toString()
      );

      if (violationCountRef.current >= MAX_VIOLATIONS) {
        terminateAssessment(reason);
      } else {
        alert(
          '⚠️ Warning!\n\n' +
            'Tab switching or opening other applications is not allowed.\n' +
            'Next violation will end your assessment.'
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        registerViolation('TAB_SWITCH');
      }
    };

    const handleBlur = () => {
      // Covers Alt+Tab, clicking other apps, switching windows
      registerViolation('WINDOW_BLUR');
    };

    const handleFullscreenExit = () => {
      if (!document.fullscreenElement) {
        registerViolation('EXIT_FULLSCREEN');
      }
    };

    // 🔥 Event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenExit);

    // Restore count if page reloads
    const storedCount = sessionStorage.getItem('interview_tab_switch_count');
    if (storedCount) {
      violationCountRef.current = parseInt(storedCount, 10);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenExit);
    };
  }, [isActive, isCompleted, onForceComplete]);

  return null; // No UI needed (alerts handle UX)
};

export default TabSwitchMonitor;
