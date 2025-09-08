import axios from "axios";
import { useState, useRef, useCallback, useEffect } from "react";

type StartRecordingType = { blob?: Blob; url?: string };

interface CameraHook {
  stream: MediaStream | null;
  isRecording: boolean;
  uploadProgress: number;
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
  const [uploadProgress, setUploadProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // S3 multipart upload refs
  const uploadKeyRef = useRef<string>("");
  const uploadPartNumberRef = useRef<number>(1);

  // Upload control
  const chunkBufferRef = useRef<Blob[]>([]);
  const uploadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppingRef = useRef(false);

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      if (streamRef.current) stopCamera();

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: true,
      });

      setStream(mediaStream);
      streamRef.current = mediaStream;
    } catch (err: any) {
      console.error("Camera error:", err);
      setError(err.message || "Failed to start camera");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setIsRecording(false);
    mediaRecorderRef.current = null;
  }, []);

  const initS3Upload = useCallback(async () => {
    try {
      const res = await axios.post(
        "http://localhost:5000/api/jobposts/start-upload"
      );
      uploadKeyRef.current = res.data.key;
      uploadPartNumberRef.current = 1;
    } catch (err) {
      console.error("Failed to initialize S3 upload", err);
      setError("Failed to start S3 upload");
    }
  }, []);

  const uploadChunk = useCallback(async (chunk: Blob, partNumber: number) => {
    try {
      const formData = new FormData();
      formData.append("chunk", chunk);
      formData.append("key", uploadKeyRef.current);
      formData.append("partNumber", partNumber.toString());

      await axios.post(
        "http://localhost:5000/api/jobposts/upload-part",
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const percent = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            setUploadProgress(percent);
          },
        }
      );

      console.log(`✅ Uploaded part ${partNumber}`);
    } catch (err) {
      console.error("❌ Chunk upload failed:", err);
      setError("Chunk upload failed");
    }
  }, []);

  const completeS3Upload = useCallback(async () => {
    try {
      const res = await axios.post(
        "http://localhost:5000/api/jobposts/complete-upload",
        { key: uploadKeyRef.current }
      );

      setUploadProgress(100);
      return res.data.url;
    } catch (err) {
      console.error("Failed to complete S3 upload", err);
      setError("Failed to complete S3 upload");
      return null;
    }
  }, []);

  const startRecording = useCallback(
    async (): Promise<StartRecordingType | null> => {
      if (!streamRef.current) {
        setError("No camera stream available");
        return null;
      }

      await initS3Upload();

      recordedChunksRef.current = [];
      chunkBufferRef.current = [];
      isStoppingRef.current = false;

      let blobResolve: ((value: StartRecordingType) => void) | null = null;

      const blobPromise = new Promise<StartRecordingType>((resolve) => {
        blobResolve = resolve;
      });

      const mimeType = MediaRecorder.isTypeSupported(
        "video/webm;codecs=vp8,opus"
      )
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && !isStoppingRef.current) {
          recordedChunksRef.current.push(event.data);
          chunkBufferRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // flush remaining buffer immediately
        for (const chunk of chunkBufferRef.current) {
          await uploadChunk(chunk, uploadPartNumberRef.current++);
        }
        chunkBufferRef.current = [];

        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = await completeS3Upload();
        setIsRecording(false);
        if (blobResolve) blobResolve({ blob, url });

        // stop timer
        if (uploadTimerRef.current) {
          clearInterval(uploadTimerRef.current);
          uploadTimerRef.current = null;
        }
      };

      mediaRecorder.onerror = (event: any) => {
        console.error("Recording error:", event.error);
        setError(event.error?.message || "Recording failed");
        setIsRecording(false);
      };

      mediaRecorder.start(1000); // collect data every 1s
      setIsRecording(true);

      // Every 5s, upload 1 buffered chunk
      uploadTimerRef.current = setInterval(async () => {
        if (chunkBufferRef.current.length > 0 && !isStoppingRef.current) {
          const chunk = chunkBufferRef.current.shift()!;
          await uploadChunk(chunk, uploadPartNumberRef.current++);
        }
      }, 5000);

      return blobPromise;
    },
    [initS3Upload, uploadChunk, completeS3Upload]
  );

  const stopRecording = useCallback(
    async (): Promise<StartRecordingType | null> => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        isStoppingRef.current = true;

        mediaRecorderRef.current.stop();

        return new Promise((resolve) => {
          mediaRecorderRef.current!.onstop = async () => {
            // flush buffer (done in onstop above)
            const blob = new Blob(recordedChunksRef.current, {
              type: mediaRecorderRef.current?.mimeType || "video/webm",
            });
            const url = await completeS3Upload();
            setIsRecording(false);
            resolve({ blob, url });
          };
        });
      }
      return null;
    },
    [completeS3Upload]
  );

  return {
    stream,
    isRecording,
    uploadProgress,
    startCamera,
    stopCamera,
    startRecording,
    stopRecording,
    error,
  };
};
