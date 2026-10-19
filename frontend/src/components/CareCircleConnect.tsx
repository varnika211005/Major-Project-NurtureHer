import type { IScannerControls } from "@zxing/browser";
import { Camera, LoaderCircle, QrCode, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ConnectState =
  | "idle"
  | "starting-camera"
  | "scanning"
  | "decoding"
  | "submitting"
  | "checking-status"
  | "pending"
  | "pending-after-revocation"
  | "approved"
  | "approved-refresh-failed"
  | "rejected"
  | "revoked"
  | "invalid"
  | "expired"
  | "invalid-token"
  | "permission-denied"
  | "camera-unavailable";

const stateMessages: Record<ConnectState, string> = {
  idle: "Scan the mother's CareCircle QR code or upload its image. Her approval is required before any shared information can be viewed.",
  "starting-camera": "Starting your camera…",
  scanning: "Camera is active. Point it at the mother's QR code.",
  decoding: "Reading QR image locally…",
  submitting: "Verifying the QR with NurtureHer…",
  "checking-status": "Checking the request with NurtureHer…",
  pending: "Request sent. The mother must approve it before any shared information is available.",
  "pending-after-revocation": "Previous access was revoked. A new request is waiting for the mother's explicit approval; no shared information is available yet.",
  approved: "This connection is approved. Only information the mother chose to share can be viewed.",
  "approved-refresh-failed": "The connection is approved, but its permitted summary could not be refreshed. Use Mother's Permitted Status to retry.",
  rejected: "The mother declined this access request. No health information is available.",
  revoked: "The mother revoked this access. No health information is available.",
  invalid: "This image does not contain a readable CareCircle QR code.",
  expired: "This CareCircle QR code has expired. Ask the mother to display a current code.",
  "invalid-token": "The QR code or access key is invalid. Check it and try again.",
  "permission-denied": "Camera permission was denied. Allow camera access in your browser settings or upload the QR image instead.",
  "camera-unavailable": "A camera is unavailable or blocked by this browser. Upload the QR image instead.",
};

function extractToken(decodedText: string): string | null {
  const text = decodedText.trim();
  if (!text || text.length > 2048) return null;

  try {
    const url = new URL(text, window.location.origin);
    const token = url.searchParams.get("token");
    if (token && url.pathname.replace(/\/+$/, "") === "/verify-access" && /^[A-Za-z0-9_-]{20,128}$/.test(token)) {
      return token;
    }
  } catch {
    return null;
  }

  return /^[A-Za-z0-9_-]{20,128}$/.test(text) ? text : null;
}

export function CareCircleConnect({ onApproved }: { onApproved: (accessId: string) => Promise<void> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const cameraRequestedRef = useRef(false);
  const processingRef = useRef(false);
  const [state, setState] = useState<ConnectState>("idle");
  const [manualToken, setManualToken] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);

  function stopCamera() {
    cameraRequestedRef.current = false;
    controlsRef.current?.stop();
    controlsRef.current = null;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cameraRequestedRef.current = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, []);

  async function submitDecodedText(decodedText: string) {
    stopCamera();
    const token = extractToken(decodedText);
    if (!token) {
      setState("invalid");
      return;
    }
    await submitToken(token);
  }

  async function submitToken(token: string) {
    if (processingRef.current) return;
    if (!/^[A-Za-z0-9_-]{20,128}$/.test(token)) {
      setState("invalid-token");
      return;
    }
    processingRef.current = true;
    setState("submitting");
    try {
      const response = await api.requestCareCircleAccess(token, "Caregiver");
      setRequestId(response.id);
      if (response.status === "approved") {
        setState("approved");
        try {
          await onApproved(response.id);
        } catch {
          setState("approved-refresh-failed");
        }
      } else if (response.status === "revoked") {
        setState("revoked");
      } else if (response.status === "rejected") {
        setState("rejected");
      } else if (response.message.toLowerCase().includes("previous access was revoked")) {
        setState("pending-after-revocation");
      } else {
        setState("pending");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      setState(message.includes("expired") ? "expired" : "invalid-token");
    } finally {
      processingRef.current = false;
    }
  }

  async function checkRequestStatus() {
    if (!requestId) return;
    setState("checking-status");
    try {
      const response = await api.careCircleRequestStatus(requestId);
      if (response.status === "approved") {
        setState("approved");
        try {
          await onApproved(response.id);
        } catch {
          setState("approved-refresh-failed");
        }
      } else if (response.status === "rejected") {
        setState("rejected");
      } else if (response.status === "revoked") {
        setState("revoked");
      } else {
        setState("pending");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      setState(message.includes("revok") ? "revoked" : "invalid-token");
    }
  }

  async function startCamera() {
    const videoElement = videoRef.current;
    if (!navigator.mediaDevices?.getUserMedia || !videoElement) {
      setState("camera-unavailable");
      return;
    }
    processingRef.current = false;
    cameraRequestedRef.current = true;
    setState("starting-camera");
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromVideoDevice(undefined, videoElement, (result, _error, scannerControls) => {
        if (result && !processingRef.current) {
          scannerControls.stop();
          void submitDecodedText(result.getText());
        }
      });
      controlsRef.current = controls;
      const stream = videoElement.srcObject;
      if (typeof MediaStream !== "undefined" && stream instanceof MediaStream) cameraStreamRef.current = stream;
      if (!mountedRef.current || !cameraRequestedRef.current || processingRef.current) {
        stopCamera();
        return;
      }
      setState("scanning");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setState(name === "NotAllowedError" || name === "SecurityError" ? "permission-denied" : "camera-unavailable");
      stopCamera();
    }
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    stopCamera();
    const extension = file.name.toLowerCase().split(".").pop();
    const allowed = new Set(["png", "jpg", "jpeg", "webp"]);
    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!extension || !allowed.has(extension) || (file.type && !allowedTypes.has(file.type))) {
      setState("invalid");
      return;
    }

    setState("decoding");
    const imageUrl = URL.createObjectURL(file);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const result = await new BrowserQRCodeReader().decodeFromImageUrl(imageUrl);
      await submitDecodedText(result.getText());
    } catch {
      setState("invalid");
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  const busy = state === "starting-camera" || state === "decoding" || state === "submitting" || state === "checking-status";
  return (
    <Card className="mx-auto w-full max-w-3xl p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <QrCode className="mt-1 h-5 w-5 shrink-0 text-primary" />
        <div>
          <h2 className="text-lg font-black text-ink dark:text-white">Connect to Mother</h2>
          <p className="mt-1 text-xs leading-5 text-muted dark:text-white/60">
            Scan her CareCircle QR with your camera or choose an image. The QR is decoded on this device; its token is verified by NurtureHer.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button type="button" disabled={busy || state === "scanning"} onClick={() => void startCamera()}>
          <Camera className="mr-2 h-4 w-4" />
          {state === "scanning" ? "Camera scanning…" : "Scan with camera"}
        </Button>
        <label className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-lavender-200 bg-white px-4 py-2 text-sm font-bold text-ink transition hover:bg-lavender-50 dark:border-white/10 dark:bg-white/10 dark:text-white ${busy ? "pointer-events-none opacity-50" : ""}`}>
          <Upload className="mr-2 h-4 w-4" />
          Upload QR image
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              void handleUpload(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      <form
        className="mt-5 space-y-2 border-t border-lavender-100 pt-4 dark:border-white/10"
        onSubmit={(event) => {
          event.preventDefault();
          const scannedToken = extractToken(manualToken);
          if (!scannedToken) {
            setState("invalid-token");
            return;
          }
          void submitToken(scannedToken);
        }}
      >
        <label htmlFor="carecircle-manual-token" className="block text-xs font-bold text-muted dark:text-white/70">
          Or enter the mother's CareCircle access key
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="carecircle-manual-token"
            value={manualToken}
            onChange={(event) => setManualToken(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="min-h-11 min-w-0 flex-1 rounded-2xl border border-lavender-200 bg-white px-4 text-sm text-ink outline-none focus:border-primary dark:border-white/10 dark:bg-white/5 dark:text-white"
            placeholder="Paste secure access key"
          />
          <Button type="submit" disabled={busy || !manualToken.trim()}>
            Verify access key
          </Button>
        </div>
      </form>

      {(state === "pending" || state === "pending-after-revocation") && requestId && (
        <Button type="button" variant="secondary" className="mt-3 w-full sm:w-auto" disabled={busy} onClick={() => void checkRequestStatus()}>
          Check request status
        </Button>
      )}

      <div className={`relative mt-4 overflow-hidden rounded-2xl bg-black ${state === "scanning" || state === "starting-camera" ? "" : "hidden"}`}>
          <video ref={videoRef} className="max-h-80 w-full object-cover" muted playsInline />
          <Button type="button" variant="secondary" className="absolute right-3 top-3" onClick={() => { stopCamera(); setState("idle"); }}>
            <X className="mr-1 h-4 w-4" /> Stop camera
          </Button>
      </div>

      <p role="status" aria-live="polite" className={`mt-4 rounded-xl p-3 text-sm ${state === "invalid" || state === "expired" || state === "rejected" || state === "revoked" || state === "permission-denied" || state === "camera-unavailable" || state === "approved-refresh-failed" ? "bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200" : "bg-lavender-50 text-ink dark:bg-white/5 dark:text-white"}`}>
        {busy && <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />}
        {stateMessages[state]}
      </p>
    </Card>
  );
}
