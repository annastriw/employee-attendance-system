import { FaceDetector, FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type { FaceObservation } from "./capture-policy";

const WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_ROOT = "https://storage.googleapis.com/mediapipe-models";

export async function loadVision() {
  const files = await FilesetResolver.forVisionTasks(WASM_ROOT);
  const detector = await FaceDetector.createFromOptions(files, {
    baseOptions: { modelAssetPath: `${MODEL_ROOT}/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`, delegate: "CPU" },
    runningMode: "VIDEO", minDetectionConfidence: 0.3,
  });
  try {
    const landmarker = await FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: `${MODEL_ROOT}/face_landmarker/face_landmarker/float16/1/face_landmarker.task`, delegate: "CPU" },
      runningMode: "VIDEO", numFaces: 2, outputFaceBlendshapes: true,
    });
    return {
      inspect(video: HTMLVideoElement, at: number) {
        const found = detector.detectForVideo(video, at);
        const faces: FaceObservation[] = found.detections.map(({ boundingBox: b, categories }) => ({
          confidence: categories[0]?.score ?? 0,
          box: { x: (b?.originX ?? NaN) / video.videoWidth, y: (b?.originY ?? NaN) / video.videoHeight,
            width: (b?.width ?? NaN) / video.videoWidth, height: (b?.height ?? NaN) / video.videoHeight },
        }));
        if (faces.length !== 1) return { faces, landmarkCount: 0, left: NaN, right: NaN };
        const landmarks = landmarker.detectForVideo(video, at);
        const categories = landmarks.faceBlendshapes[0]?.categories ?? [];
        return { faces, landmarkCount: landmarks.faceLandmarks.length,
          left: categories.find(c => c.categoryName === "eyeBlinkLeft")?.score ?? NaN,
          right: categories.find(c => c.categoryName === "eyeBlinkRight")?.score ?? NaN };
      },
      close() { detector.close(); landmarker.close(); },
    };
  } catch (error) {
    detector.close();
    throw error;
  }
}
export type Vision = Awaited<ReturnType<typeof loadVision>>;
