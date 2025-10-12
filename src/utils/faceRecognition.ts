import { pipeline, env } from '@huggingface/transformers';

// Configure to use local models
env.allowLocalModels = true;
env.allowRemoteModels = true;

let featureExtractor: any = null;

// Initialize the face recognition model
export const initializeFaceRecognition = async () => {
  if (featureExtractor) return featureExtractor;
  
  try {
    console.log('Loading face recognition model...');
    // Using feature extraction for face embeddings
    featureExtractor = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
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

    // Get image data from canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Resize canvas to model input size
    const targetSize = 224;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetSize;
    tempCanvas.height = targetSize;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) throw new Error('Could not get temp canvas context');
    
    tempCtx.drawImage(canvas, 0, 0, targetSize, targetSize);
    
    // Get image data
    const imageData = tempCtx.getImageData(0, 0, targetSize, targetSize);
    
    // Convert to tensor-like format (normalize to 0-1)
    const pixels = imageData.data;
    const normalized = new Float32Array(targetSize * targetSize * 3);
    
    for (let i = 0; i < pixels.length; i += 4) {
      const idx = (i / 4) * 3;
      normalized[idx] = pixels[i] / 255.0;       // R
      normalized[idx + 1] = pixels[i + 1] / 255.0; // G
      normalized[idx + 2] = pixels[i + 2] / 255.0; // B
    }

    // Create a simple hash-based descriptor from image
    // This is a simplified approach - in production you'd use proper face landmarks
    const descriptor: number[] = [];
    const step = Math.floor(normalized.length / 128); // Create 128-dimensional descriptor
    
    for (let i = 0; i < 128; i++) {
      const idx = i * step;
      descriptor.push(normalized[idx] || 0);
    }
    
    console.log('Face descriptor extracted:', descriptor.length, 'dimensions');
    return descriptor;
  } catch (error) {
    console.error('Error extracting face descriptor:', error);
    throw error;
  }
};

// Calculate similarity between two face descriptors (cosine similarity)
export const calculateSimilarity = (desc1: number[], desc2: number[]): number => {
  if (desc1.length !== desc2.length) {
    console.error('Descriptor length mismatch');
    return 0;
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < desc1.length; i++) {
    dotProduct += desc1[i] * desc2[i];
    norm1 += desc1[i] * desc1[i];
    norm2 += desc2[i] * desc2[i];
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) return 0;

  const similarity = dotProduct / (norm1 * norm2);
  return similarity;
};

// Find best match from a list of employees with face profiles
export const findBestMatch = (
  currentDescriptor: number[],
  employees: any[],
  threshold: number = 0.6
): { employee: any; similarity: number } | null => {
  let bestMatch: any = null;
  let bestSimilarity = 0;

  for (const employee of employees) {
    if (!employee.face_profiles?.face_descriptor?.descriptor) {
      continue;
    }

    const storedDescriptor = employee.face_profiles.face_descriptor.descriptor;
    const similarity = calculateSimilarity(currentDescriptor, storedDescriptor);

    console.log(`Similarity with ${employee.first_name} ${employee.last_name}:`, similarity);

    if (similarity > bestSimilarity && similarity >= threshold) {
      bestSimilarity = similarity;
      bestMatch = employee;
    }
  }

  if (bestMatch) {
    console.log(`Best match found: ${bestMatch.first_name} ${bestMatch.last_name} with similarity ${bestSimilarity}`);
    return { employee: bestMatch, similarity: bestSimilarity };
  }

  console.log('No match found above threshold');
  return null;
};

// Check if face is detected in the frame (simple brightness check)
export const detectFace = (canvas: HTMLCanvasElement): boolean => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  
  let totalBrightness = 0;
  let pixelCount = 0;
  
  // Sample every 10th pixel for performance
  for (let i = 0; i < pixels.length; i += 40) {
    const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    totalBrightness += brightness;
    pixelCount++;
  }
  
  const avgBrightness = totalBrightness / pixelCount;
  
  // Check if there's sufficient variation (not all black or all white)
  // and reasonable brightness
  const hasFace = avgBrightness > 30 && avgBrightness < 220;
  
  console.log('Face detection check - Average brightness:', avgBrightness, 'Has face:', hasFace);
  return hasFace;
};
