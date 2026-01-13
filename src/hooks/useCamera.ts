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

    // Don't stop recording here - use stopRecording() separately to get the blob
    // This function is just for cleaning up the camera stream
    
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        console.log("Stopping track:", track.kind, track.label);
        track.stop();
      });
      streamRef.current = null;
    }

    setStream(null);
    // Don't set isRecording to false here - let stopRecording() handle that
    setError(null);
    // Don't clear mediaRecorderRef here - let stopRecording() handle that after blob is created
  }, []);

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
          // Wait a bit for cleanup
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        recordedChunksRef.current = [];
        resolveBlobRef.current = null; // Clear any previous resolve function

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
        const mediaRecorder = new MediaRecorder(streamRef.current!, options);

        mediaRecorder.ondataavailable = (event) => {
          // console.log("Data available:", event.data.size, "bytes");
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onerror = (event: any) => {
          console.error("MediaRecorder error:", event.error);
          setError(
            "Recording error: " + (event.error?.message || "Unknown error")
          );
          setIsRecording(false);
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
        
        // Return null promise for startRecording - blob will be returned by stopRecording
        return Promise.resolve(null);
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
      console.log("📹 Stopping recording...", {
        hasRecorder: !!mediaRecorderRef.current,
        state: mediaRecorderRef.current?.state,
        isRecording: isRecording,
        chunksCount: recordedChunksRef.current.length
      });
      
      // Store reference to current recorder to avoid TypeScript issues
      const currentRecorder = mediaRecorderRef.current;
      
      // If no recorder, return null
      if (!currentRecorder) {
        console.warn("⚠️ No recorder found - recording may not have started");
        setIsRecording(false);
        // Check if we have any recorded chunks anyway
        if (recordedChunksRef.current.length > 0) {
          console.log("📦 Found recorded chunks, creating blob...");
          const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
          console.log("✅ Blob created from chunks:", { size: blob.size });
          recordedChunksRef.current = []; // Clear chunks
          return { blob };
        }
        return null;
      }
      
      // If already inactive, try to create blob from existing chunks
      if (currentRecorder.state === "inactive") {
        console.log("⚠️ Recorder already inactive, creating blob from existing chunks...");
        if (recordedChunksRef.current.length > 0) {
          const mimeType = currentRecorder.mimeType || "video/webm";
          const blob = new Blob(recordedChunksRef.current, { type: mimeType });
          console.log("✅ Blob created from existing chunks:", { size: blob.size, type: blob.type });
          setIsRecording(false);
          mediaRecorderRef.current = null;
          return { blob };
        } else {
          console.warn("⚠️ No chunks recorded");
          setIsRecording(false);
          mediaRecorderRef.current = null;
          return null;
        }
      }

      // Create promise that resolves when recording stops
      const blobPromise = new Promise<StartRecordingType>((resolve, reject) => {
        // Store resolve function for use in onstop handler
        resolveBlobRef.current = resolve;
        
        // Set up the onstop handler BEFORE calling stop()
        currentRecorder.onstop = () => {
          try {
            console.log("📹 onstop handler called, creating blob...");
            const mimeType = currentRecorder.mimeType || "video/webm";
            const blob = new Blob(recordedChunksRef.current, {
              type: mimeType,
            });
            
            console.log("✅ Recording stopped, blob created:", {
              size: blob.size,
              type: blob.type,
              chunks: recordedChunksRef.current.length
            });

            setIsRecording(false);
            
            // Clear the recorder reference after blob is created
            mediaRecorderRef.current = null;
            
            // Resolve the promise with the blob
            if (resolveBlobRef.current) {
              resolveBlobRef.current({ blob });
              resolveBlobRef.current = null;
            } else {
              resolve({ blob });
            }
          } catch (err) {
            console.error("❌ Error creating blob:", err);
            setIsRecording(false);
            if (resolveBlobRef.current) {
              resolveBlobRef.current = null;
            }
            reject(err);
          }
        };

        currentRecorder.onerror = (event: any) => {
          console.error("❌ MediaRecorder error on stop:", event.error);
          setIsRecording(false);
          if (resolveBlobRef.current) {
            resolveBlobRef.current = null;
          }
          reject(event.error || new Error("Recording stop error"));
        };

        // Now stop the recording - this will trigger onstop
        try {
          currentRecorder.stop();
          console.log("⏹️ Recording stop() called, waiting for onstop...");
        } catch (stopErr) {
          console.error("❌ Error calling stop():", stopErr);
          setIsRecording(false);
          if (resolveBlobRef.current) {
            resolveBlobRef.current = null;
          }
          reject(stopErr);
        }
      });

      // Wait for the promise to resolve (recording to actually stop and blob to be created)
      const result = await blobPromise;
      console.log("✅ Recording stopped successfully, blob ready:", {
        size: result.blob.size,
        type: result.blob.type
      });
      return result;
    } catch (e) {
      console.error("❌ Error stopping recording:", e);
      setIsRecording(false);
      resolveBlobRef.current = null;
      return null;
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
