import { useEffect, useRef, useState } from "react";
import { AuthError, type AuthClient } from "../../lib/auth-client";
import {
  uploadPhoto,
  type CapturedPhoto,
  type PhotoPurpose,
  type ReadyPhoto,
} from "./photo-upload";

interface Upload {
  blob: Blob;
  purpose: PhotoPurpose;
  busy: boolean;
  ready?: ReadyPhoto;
  error?: string;
}
export function usePhotoUpload(
  client: AuthClient,
  photo: CapturedPhoto | null,
  purpose: PhotoPurpose,
  onSessionExpired: () => void,
) {
  const [upload, setUpload] = useState<Upload | null>(null);
  const attempt = useRef<{
    blob: Blob;
    purpose: PhotoPurpose;
    key: string;
  } | null>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    const discard = () => {
      request.current?.abort();
      request.current = null;
      attempt.current = null;
    };
    const hidden = () => {
      if (document.hidden) discard();
    };
    window.addEventListener("pagehide", discard);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      discard();
      window.removeEventListener("pagehide", discard);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [photo?.blob, purpose]);

  async function save() {
    if (!photo || request.current) return;
    if (
      upload?.blob === photo.blob &&
      upload.purpose === purpose &&
      upload.ready
    )
      return upload.ready;
    const controller = new AbortController();
    request.current = controller;
    if (
      attempt.current?.blob !== photo.blob ||
      attempt.current.purpose !== purpose
    ) {
      attempt.current = { blob: photo.blob, purpose, key: crypto.randomUUID() };
    }
    setUpload({ blob: photo.blob, purpose, busy: true });
    try {
      const ready = await uploadPhoto(
        client,
        photo,
        purpose,
        attempt.current.key,
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setUpload({ blob: photo.blob, purpose, busy: false, ready });
        return ready;
      }
    } catch (reason) {
      if (controller.signal.aborted) return;
      if (reason instanceof AuthError && reason.status === 401) {
        onSessionExpired();
        return;
      }
      const uncertain =
        reason instanceof AuthError &&
        [0, 409, 503, 504].includes(reason.status);
      setUpload({
        blob: photo.blob,
        purpose,
        busy: false,
        error: uncertain
          ? "Status penyimpanan belum dapat dipastikan. Coba simpan lagi; foto yang sama tidak akan digandakan."
          : reason instanceof Error
            ? reason.message
            : "Foto belum dapat disimpan. Coba lagi.",
      });
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  return {
    upload:
      upload?.blob === photo?.blob && upload?.purpose === purpose
        ? upload
        : null,
    save,
  };
}
