// services/pedometerService.ts
import { Pedometer } from "expo-sensors";
import { useEffect, useRef, useState } from "react";

interface PedometerHook {
  steps: number;          // session-relative steps
  totalToday: number;     // steps since midnight
  isAvailable: boolean;
  resetBaseline: () => void;
}

export function usePedometer(): PedometerHook {
  const [isAvailable, setIsAvailable] = useState(false);
  const [steps, setSteps] = useState(0);
  const [totalToday, setTotalToday] = useState(0);

  const baselineRef = useRef(0);
  const lastReadingRef = useRef(0);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    const init = async () => {
      const avail = await Pedometer.isAvailableAsync();
      if (cancelled) return;
      setIsAvailable(avail);

      if (!avail) return;

      // get today’s steps from midnight
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      try {
        const result = await Pedometer.getStepCountAsync(startOfDay, now);
        if (!cancelled) setTotalToday(result.steps || 0);
      } catch (e) {
        console.log("getStepCountAsync error:", e);
      }

      // live updates
      subscription = Pedometer.watchStepCount(r => {
        if (baselineRef.current === 0) baselineRef.current = r.steps;
        lastReadingRef.current = r.steps;
        setSteps(r.steps - baselineRef.current);

        // also bump today’s steps estimate
        setTotalToday(prev => prev + (r.steps - lastReadingRef.current));
      });
    };

    init();

    return () => {
      cancelled = true;
      subscription && subscription.remove();
    };
  }, []);

  const resetBaseline = () => {
    baselineRef.current = lastReadingRef.current;
    setSteps(0);
  };

  return { steps, totalToday, isAvailable, resetBaseline };
}
