import { useEffect, useRef, useState } from 'react';

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll'];

/**
 * SessionTimer — shows a live countdown to automatic logout.
 * Any user activity (mouse, keyboard, scroll) resets the timer.
 * Uses its own state so only this tiny component re-renders each second.
 */
function SessionTimer({ timeoutMs = 30 * 60 * 1000, onExpire }) {
  const lastActivity = useRef(Date.now());
  const onExpireRef  = useRef(onExpire);
  const [remaining, setRemaining] = useState(timeoutMs);

  // Keep ref in sync without re-running the effect
  useEffect(() => { onExpireRef.current = onExpire; });

  useEffect(() => {
    const touch = () => { lastActivity.current = Date.now(); };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    const timerId = setInterval(() => {
      const left = timeoutMs - (Date.now() - lastActivity.current);
      if (left <= 0) {
        clearInterval(timerId);
        onExpireRef.current?.();
        return;
      }
      setRemaining(left);
    }, 1000);

    return () => {
      clearInterval(timerId);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, touch));
    };
  }, [timeoutMs]);

  const total   = Math.max(0, Math.floor(remaining / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');

  const isLow = total < 5 * 60; // < 5 min — warn user

  return (
    <span
      className={`session-timer ${isLow ? 'session-timer--low' : ''}`}
      title="Auto-logout after 30 minutes of inactivity"
    >
      <span className="session-timer__dot" />
      Session {minutes}:{seconds}
    </span>
  );
}

export default SessionTimer;
