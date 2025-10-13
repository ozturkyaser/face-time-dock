import { pipeline, env } from '@huggingface/transformers';
import { loadOpenCV } from './opencvLoader';

// Configure transformers to download from HuggingFace CDN
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;
env.backends.onnx.wasm.proxy = false;

let featureExtractor: any = null;

// Initialize the face recognition model
export const initializeFaceRecognition = async () => {
  if (featureExtractor) return featureExtractor;
  
  try {
    console.log('Loading face recognition model from HuggingFace...');
    // Load OpenCV for face detection
    await loadOpenCV();
    
    // Using Resnet-50 with better feature extraction for faces
    featureExtractor = await pipeline(
      'image-feature-extraction',
      'Xenova/resnet-50'
    );
    console.log('Face recognition model loaded successfully');
    return featureExtractor;
  } catch (error) {
    console.error('Error loading face recognition model:', error);
    throw error;
  }
};

// Extract face descriptor from canvas
export const extractFaceDescriptor = async (canvas: HTMLCanvasElement): Promise<number[]> => {
  try {
    if (!featureExtractor) {
      await initializeFaceRecognition();
    }

    console.log('Extracting face descriptor from canvas...');
    
    // Prepare canvas for model input - ResNet uses 224x224
    const targetSize = 224;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetSize;
    tempCanvas.height = targetSize;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) throw new Error('Could not get canvas context');
    
    // Draw and resize image with better quality
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';
    tempCtx.drawImage(canvas, 0, 0, targetSize, targetSize);
    
    // Convert to base64 URL for the model with high quality
    const dataUrl = tempCanvas.toDataURL('image/jpeg', 1.0);
    
    console.log('Processing image with ML model...');
    
    // Extract features using model
    const output = await featureExtractor(dataUrl, {
      pooling: 'mean',
      normalize: true
    });
    
    console.log('Model output received:', output);
    
    // Extract descriptor from output
    let descriptor: number[];
    if (output && typeof output === 'object' && 'data' in output) {
      descriptor = Array.from(output.data as Float32Array);
    } else if (Array.isArray(output)) {
      descriptor = output;
    } else if (output && typeof output === 'object' && 'tolist' in output) {
      descriptor = output.tolist();
      if (Array.isArray(descriptor[0])) {
        descriptor = descriptor[0]; // Flatten if nested
      }
    } else {
      throw new Error('Unexpected model output format');
    }
    
    // Validate descriptor
    if (!descriptor || descriptor.length === 0) {
      throw new Error('Invalid descriptor: empty or undefined');
    }
    
    // Check if descriptor contains valid values (not all zeros)
    const nonZeroValues = descriptor.filter(val => Math.abs(val) > 0.001).length;
    if (nonZeroValues < descriptor.length * 0.1) {
      throw new Error('Invalid descriptor: too many zero values');
    }
    
    console.log('Face descriptor extracted:', descriptor.length, 'dimensions');
    console.log('Non-zero values:', nonZeroValues, '/', descriptor.length);
    console.log('First 5 values:', descriptor.slice(0, 5).map(v => v.toFixed(4)));
    
    return descriptor;
  } catch (error) {
    console.error('Error extracting face descriptor:', error);
    throw error;
  }
};

// Calculate similarity between two face descriptors (cosine similarity)
export const calculateSimilarity = (desc1: number[], desc2: number[]): number => {
  if (desc1.length !== desc2.length) {
    console.error('Descriptor length mismatch:', desc1.length, 'vs', desc2.length);
    return 0;
  }

  // Normalize descriptors first for better comparison
  const normalize = (desc: number[]) => {
    const magnitude = Math.sqrt(desc.reduce((sum, val) => sum + val * val, 0));
    return magnitude === 0 ? desc : desc.map(val => val / magnitude);
  };

  const norm1 = normalize(desc1);
  const norm2 = normalize(desc2);

  // Calculate cosine similarity
  let dotProduct = 0;
  for (let i = 0; i < norm1.length; i++) {
    dotProduct += norm1[i] * norm2[i];
  }

  // Clamp to [-1, 1] range to handle floating point errors
  const similarity = Math.max(-1, Math.min(1, dotProduct));
  
  console.log('Calculated similarity:', similarity.toFixed(4));
  return similarity;
};

// Find best match from a list of employees with face profiles
export const findBestMatch = (
  currentDescriptor: number[],
  employees: any[],
  threshold: number = 0.85  // Higher threshold for better precision - 85%
): { employee: any; similarity: number } | null => {
  let bestMatch: any = null;
  let bestSimilarity = 0;
  
  console.log('=== Starting face matching ===');
  console.log('Number of employees to check:', employees.length);
  console.log('Threshold:', threshold);
  console.log('Current descriptor length:', currentDescriptor.length);

  const similarities: Array<{ name: string; similarity: number }> = [];

  for (const employee of employees) {
    // Support both data structures:
    // 1. employee.face_profiles.face_descriptor.descriptor (from Terminal)
    // 2. employee.face_descriptor.descriptor (from EmployeeLogin)
    let storedDescriptor: number[] | null = null;
    let employeeName = '';
    
    if (employee.face_profiles?.face_descriptor?.descriptor) {
      // Structure from Terminal: employees with nested face_profiles
      storedDescriptor = employee.face_profiles.face_descriptor.descriptor;
      employeeName = `${employee.first_name} ${employee.last_name}`;
    } else if (employee.face_descriptor?.descriptor) {
      // Structure from EmployeeLogin: face_profiles with nested employees
      storedDescriptor = employee.face_descriptor.descriptor;
      employeeName = employee.employees 
        ? `${employee.employees.first_name} ${employee.employees.last_name}`
        : 'Unknown';
    }
    
    if (!storedDescriptor) {
      console.log(`Skipping ${employeeName || 'unknown employee'} - no face descriptor`);
      continue;
    }
    console.log(`\nComparing with ${employeeName}:`);
    console.log('Stored descriptor length:', storedDescriptor.length);
    
    if (currentDescriptor.length !== storedDescriptor.length) {
      console.log('❌ Descriptor length mismatch - skipping');
      continue;
    }
    
    const similarity = calculateSimilarity(currentDescriptor, storedDescriptor);
    similarities.push({ name: employeeName, similarity });

    console.log(`→ Similarity: ${(similarity * 100).toFixed(2)}%`);

    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = employee;
    }
  }

  console.log('\n=== All similarities ===');
  similarities.sort((a, b) => b.similarity - a.similarity);
  similarities.forEach(s => console.log(`${s.name}: ${(s.similarity * 100).toFixed(2)}%`));
  console.log(`\nBest similarity: ${(bestSimilarity * 100).toFixed(2)}%`);
  console.log(`Required threshold: ${(threshold * 100).toFixed(0)}%`);

  if (bestMatch && bestSimilarity >= threshold) {
    const matchName = bestMatch.employees 
      ? `${bestMatch.employees.first_name} ${bestMatch.employees.last_name}`
      : `${bestMatch.first_name} ${bestMatch.last_name}`;
    console.log(`\n✓ Match found: ${matchName}`);
    console.log(`✓ Similarity: ${(bestSimilarity * 100).toFixed(2)}%`);
    return { employee: bestMatch, similarity: bestSimilarity };
  }

  console.log(`\n✗ No match found above threshold`);
  console.log(`Highest similarity was: ${(bestSimilarity * 100).toFixed(2)}%`);
  return null;
};

// Check if face is detected in the frame using OpenCV
export const detectFace = (canvas: HTMLCanvasElement): boolean => {
  try {
    if (!window.cv) {
      console.error('OpenCV not loaded, using fallback detection');
      return fallbackFaceDetection(canvas);
    }

    const cv = window.cv;
    
    // Convert canvas to OpenCV Mat
    const src = cv.imread(canvas);
    const gray = new cv.Mat();
    
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Load the Haar Cascade classifier for face detection
    const faceCascade = new cv.CascadeClassifier();
    faceCascade.load('haarcascade_frontalface_default.xml');
    
    // Detect faces
    const faces = new cv.RectVector();
    const msize = new cv.Size(0, 0);
    
    faceCascade.detectMultiScale(gray, faces, 1.1, 3, 0, msize, msize);
    
    const faceCount = faces.size();
    console.log('OpenCV detected faces:', faceCount);
    
    // Check if exactly one face is detected
    let isValidFace = faceCount === 1;
    
    if (isValidFace) {
      // Additional validation: Check if enough facial features are visible
      const face = faces.get(0);
      const faceROI = gray.roi(face);
      
      // Calculate the variance in the face region
      const mean = new cv.Mat();
      const stddev = new cv.Mat();
      cv.meanStdDev(faceROI, mean, stddev);
      
      const variance = stddev.doubleAt(0, 0);
      console.log('Face region variance:', variance);
      
      // If variance is too low, the face might be covered
      // Increased threshold for stricter face validation
      isValidFace = variance > 30;
      
      faceROI.delete();
      mean.delete();
      stddev.delete();
    }
    
    // Cleanup
    src.delete();
    gray.delete();
    faces.delete();
    faceCascade.delete();
    
    console.log('Valid face detected:', isValidFace);
    return isValidFace;
  } catch (error) {
    console.error('Error in OpenCV face detection:', error);
    return fallbackFaceDetection(canvas);
  }
};

// Fallback detection when OpenCV is not available
const fallbackFaceDetection = (canvas: HTMLCanvasElement): boolean => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  
  let totalBrightness = 0;
  let pixelCount = 0;
  let variance = 0;
  const brightnessValues: number[] = [];
  
  // Sample every 10th pixel for performance
  for (let i = 0; i < pixels.length; i += 40) {
    const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    totalBrightness += brightness;
    brightnessValues.push(brightness);
    pixelCount++;
  }
  
  const avgBrightness = totalBrightness / pixelCount;
  
  // Calculate variance to ensure there's actual content in the image
  for (const brightness of brightnessValues) {
    variance += Math.pow(brightness - avgBrightness, 2);
  }
  variance = variance / pixelCount;
  const stdDev = Math.sqrt(variance);
  
  // Check if there's sufficient variation (not all black, all white, or solid color)
  // and reasonable brightness
  const hasGoodBrightness = avgBrightness > 30 && avgBrightness < 220;
  const hasVariation = stdDev > 20;
  const hasFace = hasGoodBrightness && hasVariation;
  
  console.log('Fallback face detection check:');
  console.log('- Average brightness:', avgBrightness.toFixed(2));
  console.log('- Standard deviation:', stdDev.toFixed(2));
  console.log('- Has face:', hasFace);
  
  return hasFace;
};
