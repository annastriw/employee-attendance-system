import { useCallback, useEffect, useRef, useState } from "react";
import { BlinkGate, CAPTURE_POLICY, evaluateFaces, isFreshLocation, type DeviceLocation, type FaceStatus } from "./capture-policy";
import { cameraError, photograph, requestLocation } from "./browser-capture";
import { loadVision, type Vision } from "./vision";

type Phase = "idle" | "model" | "camera" | "running" | "preview" | "stopped" | "error";
interface Frame { status: FaceStatus; stable: boolean; at: number; wallTime: number; count: number; confidence: number; left: number; right: number; inferenceMs: number }
interface Run { vision?: Vision; stream?: MediaStream; timer?: ReturnType<typeof setTimeout>; gate: BlinkGate }
interface Photo { blob: Blob; url: string; method: "BLINK" | "MANUAL"; capturedAt: number; location: DeviceLocation }

export function useCaptureSpike() {
  const video = useRef<HTMLVideoElement>(null);
  const run = useRef<Run | null>(null);
  const photoUrl = useRef<string | null>(null);
  const capturePending = useRef(false);
  const locationRef = useRef<DeviceLocation | null>(null);
  const frameRef = useRef<Frame | null>(null);
  const requestId = useRef(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [locationBusy, setLocationBusy] = useState(false);
  const [location, setLocation] = useState<DeviceLocation | null>(null);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [clock, setClock] = useState(Date.now);

  const release = useCallback((current: Run) => {
    clearTimeout(current.timer);
    capturePending.current = false;
    current.stream?.getTracks().forEach(track => track.stop());
    current.vision?.close();
    current.vision = undefined;
    if (run.current === current) {
      run.current = null;
      if (video.current) video.current.srcObject = null;
    }
  }, []);

  const clearPhoto = useCallback(() => {
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    photoUrl.current = null;
    setPhoto(null);
  }, []);

  const stop = useCallback(() => {
    ++requestId.current;
    if (run.current) release(run.current);
    clearPhoto();
    locationRef.current = null;
    frameRef.current = null;
    setLocation(null);
    setFrame(null);
    setLocationBusy(false);
    setError("");
    setLocationError("");
    setPhase("stopped");
  }, [clearPhoto, release]);

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    const hidden = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", stop);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", stop);
      requestId.current += 1;
      if (run.current) release(run.current);
      if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    };
  }, [release, stop]);

  async function locate() {
    const id = ++requestId.current;
    locationRef.current = null;
    setLocation(null);
    setLocationError("");
    setLocationBusy(true);
    try {
      const value = await requestLocation();
      if (id !== requestId.current) return;
      locationRef.current = value;
      setLocation(value);
      setPhoto(previous => previous ? { ...previous, location: value } : null);
      setClock(Date.now());
    } catch (reason) {
      if (id === requestId.current) setLocationError(reason instanceof Error ? reason.message : "Lokasi gagal. Coba lagi.");
    } finally {
      if (id === requestId.current) setLocationBusy(false);
    }
  }

  async function capture(method: Photo["method"], current = run.current) {
    const last = frameRef.current;
    const where = locationRef.current;
    if (!current || run.current !== current || capturePending.current || !video.current || !last?.stable ||
        last.status !== "valid" || performance.now() - last.at > CAPTURE_POLICY.frameMaxAgeMs ||
        !isFreshLocation(where, Date.now())) return;
    capturePending.current = true;
    try {
      const blob = await photograph(video.current);
      if (run.current !== current) return;
      if (!isFreshLocation(where, Date.now())) throw new Error("Lokasi kedaluwarsa. Perbarui lokasi dan ambil ulang.");
      const value = { blob, url: URL.createObjectURL(blob), method, capturedAt: Date.now(), location: where };
      clearPhoto();
      photoUrl.current = value.url;
      setPhoto(value);
      release(current);
      setPhase("preview");
    } catch (reason) {
      if (run.current !== current) return;
      release(current);
      setError(reason instanceof Error ? reason.message : "Foto gagal. Coba lagi.");
      setPhase("error");
    }
  }

  async function start() {
    stop();
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("Kamera dan lokasi membutuhkan HTTPS atau localhost.");
      setPhase("error");
      return;
    }
    const current: Run = { gate: new BlinkGate() };
    run.current = current;
    setPhase("model");
    try {
      const vision = await loadVision();
      if (run.current !== current) { vision.close(); return; }
      current.vision = vision;
    } catch {
      if (run.current !== current) return;
      release(current);
      setError("Model wajah gagal dimuat. Periksa koneksi lalu coba lagi.");
      setPhase("error");
      return;
    }
    setPhase("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false,
      });
      if (run.current !== current) { stream.getTracks().forEach(track => track.stop()); return; }
      current.stream = stream;
      stream.getVideoTracks().forEach(track => track.addEventListener("ended", () => {
        if (run.current !== current) return;
        release(current);
        setError("Kamera terputus. Periksa perangkat dan coba lagi.");
        setPhase("error");
      }, { once: true }));
      if (!video.current) { release(current); return; }
      video.current.srcObject = stream;
      await video.current.play();
      if (run.current !== current) return;
    } catch (reason) {
      if (run.current !== current) return;
      release(current);
      setError(cameraError(reason));
      setPhase("error");
      return;
    }
    setPhase("running");
    void locate();
    let lastVideoTime = -1;
    function tick() {
      if (run.current !== current) return;
      const element = video.current;
      if (!capturePending.current && element && element.readyState >= 2 &&
          element.videoWidth > 0 && element.currentTime !== lastVideoTime) {
        lastVideoTime = element.currentTime;
        const at = performance.now();
        try {
          const result = current.vision!.inspect(element, at);
          let status = evaluateFaces(result.faces);
          if (status === "valid" && (result.landmarkCount !== 1 || !Number.isFinite(result.left) || !Number.isFinite(result.right))) status = result.landmarkCount > 1 ? "multiple" : "uncertain";
          const eligibility = current.gate.update(at, status === "valid", result.left, result.right);
          const value: Frame = { status, stable: eligibility.stable, at, wallTime: Date.now(),
            count: result.faces.length, confidence: result.faces[0]?.confidence ?? 0,
            left: result.left, right: result.right, inferenceMs: performance.now() - at };
          frameRef.current = value;
          setFrame(value);
          if (eligibility.blink) void capture("BLINK", current);
        } catch {
          release(current);
          setError("Deteksi wajah berhenti. Coba lagi; capture manual tetap membutuhkan deteksi.");
          setPhase("error");
          return;
        }
      }
      if (run.current === current) current.timer = setTimeout(tick, 100);
    }
    tick();
  }

  const locationFresh = isFreshLocation(location, clock);
  const manualReady = phase === "running" && !!frame?.stable && frame.status === "valid" &&
    clock - frame.wallTime <= CAPTURE_POLICY.frameMaxAgeMs && locationFresh;
  return { video, phase, error, frame, photo, location, locationFresh, locationError, locationBusy,
    manualReady, start, stop, locate, capture: () => capture("MANUAL") };
}
