import * as faceapi from '@vladmandic/face-api';

export const loadScanModels = async () => {
  const MODEL_URL = '/models';
  try {
    // Initialize TensorFlow.js backend
    // @ts-ignore
    await faceapi.tf.setBackend('webgl');
    // @ts-ignore
    await faceapi.tf.ready();
    
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    console.log('Scan Face API Models loaded successfully');
  } catch (error) {
    console.error('Error loading scan face API models', error);
    throw error;
  }
};

export const loadRegistrationModels = async () => {
  const MODEL_URL = '/models';
  try {
    // @ts-ignore
    await faceapi.tf.setBackend('webgl');
    // @ts-ignore
    await faceapi.tf.ready();
    
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    console.log('Registration Face API Models loaded successfully');
  } catch (error) {
    console.error('Error loading registration face API models', error);
    throw error;
  }
};

export const getFastFaceEmbedding = async (videoElement: HTMLVideoElement) => {
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
  
  const detection = await faceapi.detectSingleFace(videoElement, options)
    .withFaceLandmarks(true) // use tiny landmark net
    .withFaceDescriptor();
  
  if (!detection) return null;
  
  // The face descriptor is a Float32Array of 128 values
  return Array.from(detection.descriptor);
};

export type FaceCaptureResult = {
  descriptor: number[] | null;
  error?: string;
};

export const getHighQualityFaceEmbedding = async (videoElement: HTMLVideoElement): Promise<FaceCaptureResult> => {
  // We use a base confidence of 0.5 so we can detect it, but we enforce 0.85 manually below
  const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });
  
  const detections = await faceapi.detectAllFaces(videoElement, options)
    .withFaceLandmarks(false) // use standard landmark net
    .withFaceDescriptors();
  
  if (!detections || detections.length === 0) {
    return { descriptor: null, error: 'Wajah tidak terdeteksi sama sekali. Pastikan pencahayaan cukup dan wajah terlihat utuh.' };
  }

  // Find the largest face by bounding box area (Anti-Photobomb)
  let largestDetection = detections[0];
  let maxArea = 0;

  for (const det of detections) {
    const area = det.detection.box.width * det.detection.box.height;
    if (area > maxArea) {
      maxArea = area;
      largestDetection = det;
    }
  }

  // Calculate face area relative to the video frame
  const videoArea = videoElement.videoWidth * videoElement.videoHeight;
  const facePercentage = (maxArea / videoArea) * 100;

  // 1. Check Strict Confidence
  if (largestDetection.detection.score < 0.85) {
    return { 
      descriptor: null, 
      error: `Wajah kurang jelas/gelap (Skor: ${Math.round(largestDetection.detection.score * 100)}%). Syarat minimal 85%. Cari tempat terang & jangan bergerak.` 
    };
  }

  // 2. Check Face Distance / Size
  if (facePercentage < 8) {
    return { 
      descriptor: null, 
      error: 'Posisi HP terlalu jauh. Silakan dekatkan kamera ke wajah Anda.' 
    };
  }
  
  return { descriptor: Array.from(largestDetection.descriptor) };
};

export const compareEmbeddings = (descriptor1: number[], descriptor2: number[]) => {
  const dist = faceapi.euclideanDistance(
    new Float32Array(descriptor1),
    new Float32Array(descriptor2)
  );
  // Return true if distance is below threshold (e.g. 0.6)
  return dist < 0.6;
};
