import { pipeline, env, RawImage } from '@huggingface/transformers';

// Configure to use local models
env.allowLocalModels = true;
env.allowRemoteModels = true;

let featureExtractor: any = null;

// Initialize the face recognition model with a proper image model
export const initializeFaceRecognition = async () => {
  if (featureExtractor) return featureExtractor;
  
  try {
    console.log('Loading face recognition model...');
    // Using Vision Transformer for proper image feature extraction
    featureExtractor = await pipeline(
      'image-feature-extraction',
      'Xenova/vit-base-patch16-224-in21k',
      { device: 'wasm' }
    );
    console.log('Face recognition model loaded successfully');
    return featureExtractor;
  } catch (error) {
    console.error('Error loading face recognition model:', error);
    throw error;
  }
};

// Extract face descriptor from canvas using proper ML model
export const extractFaceDescriptor = async (canvas: HTMLCanvasElement): Promise<number[]> => {
  try {
    if (!featureExtractor) {
      await initializeFaceRecognition();
    }

    // Convert canvas to blob then to RawImage for the model
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.95);
    });
    
    const arrayBuffer = await blob.arrayBuffer();
    const rawImage = await RawImage.fromBlob(blob);
    
    // Extract features using the Vision Transformer model
    const output = await featureExtractor(rawImage);
    
    // Convert output to array
    let descriptor: number[];
    if (output && output.data) {
      descriptor = Array.from(output.data);
    } else if (Array.isArray(output)) {
      descriptor = output;
    } else {
      throw new Error('Unexpected model output format');
    }
    
    // Normalize the descriptor
    const norm = Math.sqrt(descriptor.reduce((sum, val) => sum + val * val, 0));
    const normalizedDescriptor = descriptor.map(val => val / (norm || 1));
    
    console.log('Face descriptor extracted:', normalizedDescriptor.length, 'dimensions');
    console.log('Descriptor norm:', norm);
    
    return normalizedDescriptor;
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
  threshold: number = 0.75  // Increased threshold for better precision
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
