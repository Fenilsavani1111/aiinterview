import axios from "axios";
import { useState, useRef, useCallback, useEffect } from "react";

type StartRecordingType = { blob: Blob };

interface CameraHook {
  stream: MediaStream | null;
  isRecording: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  startRecording: () => Promise<StartRecordingType | null>;
  stopRecording: () => Promise<StartRecordingType | null>;
  error: string | null;
}

export const useCamera = (): CameraHook => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const resolveBlobRef = useRef<((value: StartRecordingType) => void) | null>(
    null
  );

  // Keep reference to stream for cleanup
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      console.log("Starting camera...");

      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        setStream(null);
        streamRef.current = null;
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access not supported in this browser");
      }

      // Request camera and microphone access
      const constraints = {
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      };

      console.log("Requesting media with constraints:", constraints);
      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );

      console.log("Media stream obtained:", {
        videoTracks: mediaStream.getVideoTracks().length,
        audioTracks: mediaStream.getAudioTracks().length,
        active: mediaStream.active,
      });

      // Add event listeners for track events
      mediaStream.getVideoTracks().forEach((track) => {
        console.log("Video track:", track.label, track.readyState);
        track.addEventListener("ended", () => {
          console.log("Video track ended");
          setError("Camera disconnected. Please refresh and try again.");
        });

        track.addEventListener("mute", () => {
          console.log("Video track muted");
        });

        track.addEventListener("unmute", () => {
          console.log("Video track unmuted");
        });
      });

      mediaStream.getAudioTracks().forEach((track) => {
        console.log("Audio track:", track.label, track.readyState);
        track.addEventListener("ended", () => {
          console.log("Audio track ended");
        });
      });

      // Set stream
      setStream(mediaStream);
      streamRef.current = mediaStream;
      console.log("Camera started successfully");
    } catch (err: any) {
      console.error("Camera access error:", err);
      let errorMessage = "Failed to access camera";

      if (err.name === "NotAllowedError") {
        errorMessage =
          "Camera access denied. Please allow camera permissions and refresh the page.";
      } else if (err.name === "NotFoundError") {
        errorMessage =
          "No camera found. Please connect a camera and try again.";
      } else if (err.name === "NotReadableError") {
        errorMessage = "Camera is already in use by another application.";
      } else if (err.name === "OverconstrainedError") {
        errorMessage =
          "Camera constraints not supported. Trying with basic settings...";

        // Try with basic constraints
        try {
          console.log("Trying with basic constraints...");
          const basicStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          setStream(basicStream);
          streamRef.current = basicStream;
          console.log("Camera started with basic settings");
          return;
        } catch (basicErr) {
          console.error("Basic constraints also failed:", basicErr);
          errorMessage = "Failed to start camera even with basic settings.";
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    }
  }, []);

  const stopCamera = useCallback(() => {
    console.log("Stopping camera...");

    // Stop recording first
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("Error stopping recorder:", e);
      }
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        console.log("Stopping track:", track.kind, track.label);
        track.stop();
      });
      streamRef.current = null;
    }

    setStream(null);
    setIsRecording(false);
    setError(null);
    mediaRecorderRef.current = null;
  }, [isRecording]);

  const startRecording =
    useCallback(async (): Promise<StartRecordingType | null> => {
      console.log("Starting recording...");

      if (!streamRef.current || !streamRef.current.active) {
        const err = "No camera stream available for recording";
        console.error(err);
        setError(err);
        return null;
      }

      // Check if stream has both video and audio tracks
      const videoTracks = streamRef.current.getVideoTracks();
      const audioTracks = streamRef.current.getAudioTracks();

      console.log("Stream tracks for recording:", {
        video: videoTracks.length,
        audio: audioTracks.length,
        videoActive: videoTracks.filter((t) => t.readyState === "live").length,
        audioActive: audioTracks.filter((t) => t.readyState === "live").length,
      });

      if (videoTracks.length === 0) {
        setError("No video track available for recording");
        return null;
      }

      try {
        // Stop any existing recording
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== "inactive"
        ) {
          mediaRecorderRef.current.stop();
        }

        recordedChunksRef.current = [];

        // Check MediaRecorder support
        if (!window.MediaRecorder) {
          throw new Error("Recording not supported in this browser");
        }

        // Try different MIME types for better compatibility
        const mimeTypes = [
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm;codecs=h264,opus",
          "video/webm",
          "video/mp4",
        ];

        let selectedMimeType = "";
        for (const mimeType of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            selectedMimeType = mimeType;
            console.log("Selected MIME type:", mimeType);
            break;
          }
        }

        const options: MediaRecorderOptions = {
          videoBitsPerSecond: 1000000, // 1 Mbps
          audioBitsPerSecond: 128000, // 128 kbps
        };

        if (selectedMimeType) {
          options.mimeType = selectedMimeType;
        }

        console.log("Creating MediaRecorder with options:", options);
        let blobPromise = new Promise<StartRecordingType>((resolve, reject) => {
          const mediaRecorder = new MediaRecorder(streamRef.current!, options);

          mediaRecorder.ondataavailable = (event) => {
            // console.log("Data available:", event.data.size, "bytes");
            if (event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
            }
          };

          mediaRecorder.onstop = () => {
            console.log("Recording stopped");
            const blob = new Blob(recordedChunksRef.current, {
              type: selectedMimeType || "video/webm",
            });

            console.log("Recording complete, blob size:", blob.size);
            // Create download URL for the recording
            const url = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

            // Store recording info (could be used for download later)
            console.log("Recording available at:", url);
            // return { blob: blob };
            resolveBlobRef.current = resolve;
            resolve({ blob });
          };

          mediaRecorder.onerror = (event: any) => {
            console.error("MediaRecorder error:", event.error);
            setError(
              "Recording error: " + (event.error?.message || "Unknown error")
            );
            setIsRecording(false);
            // reject(event.error);
            return event.error;
          };

          mediaRecorder.onstart = () => {
            console.log("Recording started successfully");
            setIsRecording(true);
            setError(null);
          };

          mediaRecorderRef.current = mediaRecorder;

          // Start recording with 1-second chunks
          mediaRecorder.start(1000);
          console.log("MediaRecorder.start() called");
          return null;
        });
        return blobPromise;
      } catch (err: any) {
        console.error("Recording start error:", err);
        const errorMessage = err.message || "Failed to start recording";
        setError(errorMessage);
        setIsRecording(false);
        return null;
      }
    }, []);

  const stopRecording = useCallback(async (): Promise<StartRecordingType | null> => {
    try {
      console.log("Stopping recording...", mediaRecorderRef);
      let blobPromise = new Promise<StartRecordingType>((resolve, reject) => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== "inactive"
        ) {
          mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, {
              type: mediaRecorderRef.current?.mimeType || "video/webm",
            });
            console.log("Blob created on stop:", blob);

            if (resolveBlobRef.current) {
              resolveBlobRef.current({ blob });
              resolveBlobRef.current = null;
            }
            resolve({ blob });
          };

          mediaRecorderRef.current.stop();
          setIsRecording(false);
          console.log("Recording stop requested");
          return null;
        }
      });
      console.log("blobPromise", blobPromise)
      return blobPromise;
    } catch (e) {
      console.error("Error stopping recording:", e);
      return null
    }
  }, []);

  return {
    stream,
    isRecording,
    startCamera,
    stopCamera,
    startRecording,
    stopRecording,
    error,
  };
};
