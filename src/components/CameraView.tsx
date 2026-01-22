import React, { useEffect, useRef } from "react";
import { CameraOff } from "lucide-react";

export interface LiveProctoringReport {
  session_id?: string;
  [key: string]: unknown;
}

const getProctoringApiUrl = (override?: string): string =>
  override || (import.meta.env.VITE_PROCTORING_API_URL as string) || "";

interface CameraViewProps {
  stream: MediaStream | null;
  isRecording: boolean;
  error: string | null;
  guidance?: string;
  isActive?: boolean;
  jobTitle?: string;
  proctoringServerUrl?: string;
  frameInterval?: number;
  enableProctoring?: boolean;
  setMetrics: (metrics: Record<string, unknown>) => void;
  setAlerts: React.Dispatch<React.SetStateAction<Array<{ message?: string; type?: string;[k: string]: unknown }>>>;
  onSessionStart?: (sessionData: { session_id: string;[key: string]: unknown }) => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  stream,
  isRecording,
  error,
  guidance,
  isActive = false,
  jobTitle = "",
  proctoringServerUrl,
  frameInterval = 1000,
  enableProctoring = true,
  setMetrics,
  setAlerts,
  onSessionStart,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isInitializingRef = useRef<boolean>(false);
  const onSessionStartRef = useRef(onSessionStart);

  const apiUrl = getProctoringApiUrl(proctoringServerUrl);
  const shouldRun = Boolean(
    enableProctoring && isActive && stream && apiUrl && !error
  );

  // Keep ref updated with latest callback
  useEffect(() => {
    onSessionStartRef.current = onSessionStart;
  }, [onSessionStart]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          videoRef.current.play().catch((e) => console.error("Error playing video:", e));
        }
      };
    }
  }, [stream]);

  // Live proctoring: session start/end, frame capture
  useEffect(() => {
    if (!shouldRun) {
      // Clean up if shouldRun becomes false
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      if (sessionIdRef.current) {
        sessionIdRef.current = null;
      }
      isInitializingRef.current = false;
      return;
    }

    // Prevent duplicate initialization
    if (sessionIdRef.current || isInitializingRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const getUrl = () => getProctoringApiUrl(proctoringServerUrl);

    const stopProctoring = () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
    };

    let cancelled = false;
    isInitializingRef.current = true;

    const run = async () => {
      const base = getUrl();

      try {
        const health = await fetch(`${base}/health`);
        if (!health.ok) {
          console.warn("[LiveProctoring] Server health check failed");
          isInitializingRef.current = false;
          return;
        }
      } catch (e) {
        console.warn("[LiveProctoring] Connection error:", e);
        isInitializingRef.current = false;
        return;
      }
      if (cancelled) {
        isInitializingRef.current = false;
        return;
      }

      let sid: string;
      try {
        const res = await fetch(`${base}/api/sessions/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_data: { jobTitle, timestamp: new Date().toISOString() },
          }),
        });
        const data = await res.json();
        if (!data?.success || !data.session_id) {
          console.warn("[LiveProctoring] Failed to start session:", data?.error);
          isInitializingRef.current = false;
          return;
        }
        sid = data.session_id;
        sessionIdRef.current = sid;
        isInitializingRef.current = false;
        setMetrics({});
        setAlerts([]);

        // Save session data for parent component
        onSessionStartRef.current?.({
          session_id: sid,
          ...data,
        });
      } catch (e) {
        console.warn("[LiveProctoring] Error starting session:", e);
        isInitializingRef.current = false;
        return;
      }

      if (cancelled) {
        return;
      }

      const captureAndSendFrame = () => {
        if (!videoRef.current || !canvasRef.current || sessionIdRef.current !== sid) return;
        const v = videoRef.current;
        const c = canvasRef.current;
        if (v.readyState !== 4) return;

        const ctx = c.getContext("2d");
        if (!ctx) return;

        c.width = v.videoWidth;
        c.height = v.videoHeight;
        ctx.drawImage(v, 0, 0);

        const frameData = c.toDataURL("image/jpeg", 0.8);

        fetch(`${getUrl()}/api/sessions/${sid}/frame`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frame: frameData }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data?.success && data?.result) {
              if (data.result.metrics && typeof data.result.metrics === "object")
                setMetrics(data.result.metrics as Record<string, unknown>);
              if (Array.isArray(data.result.alerts)) {
                const newAlerts = data.result.alerts as Array<{ message?: string; type?: string;[k: string]: unknown }>;
                setAlerts((prev) => [...prev, ...newAlerts]);
              }
            }
          })
          .catch((err) => console.warn("[LiveProctoring] Frame error:", err));
      };

      const interval = Math.max(500, Number(frameInterval) || 1000);
      captureIntervalRef.current = setInterval(captureAndSendFrame, interval);
    };

    run();

    return () => {
      cancelled = true;
      stopProctoring();
      isInitializingRef.current = false;
    };
  }, [shouldRun, jobTitle, frameInterval, proctoringServerUrl]);

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Camera</span>
        </div>
        <div className="aspect-video rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center text-slate-400">
          <CameraOff className="w-12 h-12 mb-2" />
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-1">Refresh and allow camera access</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">Camera</span>
        {isRecording && (
          <span className="text-xs font-medium text-red-500 flex items-center gap-1">
            ● Recording
          </span>
        )}
      </div>

      <div className="aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
            Camera Feed
          </div>
        )}
      </div>

      {(guidance || (stream && "Stay centered • Maintain eye contact")) && (
        <p className="mt-3 text-xs text-slate-500 text-center">
          {guidance || "Stay centered • Maintain eye contact"}
        </p>
      )}
      <canvas ref={canvasRef} className="hidden" style={{ display: "none" }} />
    </div>
  );
};
