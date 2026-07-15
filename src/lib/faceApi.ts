import * as faceapi from '@vladmandic/face-api';

export const loadModels = async () => {
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
    console.log('Face API Models loaded successfully');
  } catch (error) {
    console.error('Error loading face API models', error);
    throw error;
  }
};

export const getFaceEmbedding = async (videoElement: HTMLVideoElement) => {
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
  
  const detection = await faceapi.detectSingleFace(videoElement, options)
    .withFaceLandmarks(true) // use tiny landmark net
    .withFaceDescriptor();
  
  if (!detection) return null;
  
  // The face descriptor is a Float32Array of 128 values
  return Array.from(detection.descriptor);
};

export const compareEmbeddings = (descriptor1: number[], descriptor2: number[]) => {
  const dist = faceapi.euclideanDistance(
    new Float32Array(descriptor1),
    new Float32Array(descriptor2)
  );
  // Return true if distance is below threshold (e.g. 0.6)
  return dist < 0.6;
};
