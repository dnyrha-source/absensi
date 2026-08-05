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
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
  
  const detection = await faceapi.detectSingleFace(videoElement, options)
    .withFaceLandmarks(true) // use tiny landmark net
    .withFaceDescriptor();
  
  if (!detection) return null;
  
  // Calculate face area relative to the video frame to reject tiny background faces
  const box = detection.detection.box;
  const area = box.width * box.height;
  const videoArea = videoElement.videoWidth * videoElement.videoHeight;
  const facePercentage = (area / videoArea) * 100;

  // Ignore faces that are too far away (less than 4.5% of the frame)
  if (facePercentage < 4.5) {
    return null;
  }
  
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
    if (facePercentage < 4.5) {
      return { 
        descriptor: null, 
        error: 'Posisi wajah terlalu jauh. Silakan dekatkan wajah Anda ke kamera.' 
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

export const calculateCentroid = (descriptors: number[][]): number[] => {
  if (descriptors.length === 0) return [];
  const dim = descriptors[0].length;
  const centroid = new Array(dim).fill(0);
  
  for (let i = 0; i < dim; i++) {
    let sum = 0;
    for (let j = 0; j < descriptors.length; j++) {
      sum += descriptors[j][i];
    }
    centroid[i] = sum / descriptors.length;
  }
  return centroid;
};

export const getBestDescriptors = (descriptors: number[][], countToKeep: number): number[] => {
  if (descriptors.length <= countToKeep) {
    return calculateCentroid(descriptors);
  }

  // 1. Calculate temporary centroid
  const tempCentroid = calculateCentroid(descriptors);
  const centroidFloat32 = new Float32Array(tempCentroid);

  // 2. Calculate distance of each descriptor to the temporary centroid
  const distances = descriptors.map((desc, index) => {
    const dist = faceapi.euclideanDistance(new Float32Array(desc), centroidFloat32);
    return { index, dist };
  });

  // 3. Sort by distance (closest first)
  distances.sort((a, b) => a.dist - b.dist);

  // 3.5 Check for extreme outliers
  const maxOutlier = distances[distances.length - 1].dist;
  if (maxOutlier > 0.40) {
    throw new Error('Terdeteksi pergerakan ekstrem atau perubahan wajah (Outlier > 0.40). Silakan ulangi dan tahan posisi Anda.');
  } else if (maxOutlier > 0.25) {
    console.warn(`Kualitas tangkapan sedang (Max Outlier: ${maxOutlier.toFixed(2)}). Melanjutkan dengan membuang frame buruk.`);
  }

  // 4. Keep the best `countToKeep` descriptors
  const bestIndices = distances.slice(0, countToKeep).map(d => d.index);
  const bestDescriptors = bestIndices.map(i => descriptors[i]);

  // 5. Calculate final centroid from the best descriptors
  return calculateCentroid(bestDescriptors);
};
