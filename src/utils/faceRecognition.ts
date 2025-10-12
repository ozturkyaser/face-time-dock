import { pipeline, env } from '@huggingface/transformers';

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
    // Using MobileNetV4 for better browser compatibility and availability
    featureExtractor = await pipeline(
      'image-feature-extraction',
      'onnx-community/mobilenetv4_conv_small.e2400_r224_in1k'
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
    
    // Prepare canvas for model input
    const targetSize = 224;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetSize;
    tempCanvas.height = targetSize;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) throw new Error('Could not get canvas context');
    
    // Draw and resize image
    tempCtx.drawImage(canvas, 0, 0, targetSize, targetSize);
    
    // Convert to base64 URL for the model
    const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);
    
    console.log('Processing image with ML model...');
    
    // Extract features using CLIP model
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
    
    console.log('Face descriptor extracted:', descriptor.length, 'dimensions');
    console.log('First 5 values:', descriptor.slice(0, 5));
    
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

  console.log('Similarity calculation - Norms:', { norm1: norm1.toFixed(4), norm2: norm2.toFixed(4) });

  if (norm1 === 0 || norm2 === 0) {
    console.warn('Zero norm detected!');
    return 0;
  }

  const similarity = dotProduct / (norm1 * norm2);
  console.log('Calculated similarity:', similarity.toFixed(4));
  return similarity;
};

// Find best match from a list of employees with face profiles
export const findBestMatch = (
  currentDescriptor: number[],
  employees: any[],
  threshold: number = 0.80  // Higher threshold for better precision
): { employee: any; similarity: number } | null => {
  let bestMatch: any = null;
  let bestSimilarity = 0;
  
  console.log('=== Starting face matching ===');
  console.log('Number of employees with faces:', employees.filter(e => e.face_profiles?.face_descriptor?.descriptor).length);
  console.log('Threshold:', threshold);

  const similarities: Array<{ name: string; similarity: number }> = [];

  for (const employee of employees) {
    if (!employee.face_profiles?.face_descriptor?.descriptor) {
      console.log(`Skipping ${employee.first_name} ${employee.last_name} - no face profile`);
      continue;
    }

    const storedDescriptor = employee.face_profiles.face_descriptor.descriptor;
    console.log(`\nComparing with ${employee.first_name} ${employee.last_name}:`);
    console.log('Stored descriptor length:', storedDescriptor.length);
    console.log('Current descriptor length:', currentDescriptor.length);
    
    const similarity = calculateSimilarity(currentDescriptor, storedDescriptor);
    similarities.push({ name: `${employee.first_name} ${employee.last_name}`, similarity });

    console.log(`→ Similarity: ${(similarity * 100).toFixed(2)}%`);

    if (similarity > bestSimilarity && similarity >= threshold) {
      bestSimilarity = similarity;
      bestMatch = employee;
    }
  }

  console.log('\n=== All similarities ===');
  similarities.sort((a, b) => b.similarity - a.similarity);
  similarities.forEach(s => console.log(`${s.name}: ${(s.similarity * 100).toFixed(2)}%`));

  if (bestMatch) {
    console.log(`\n✓ Best match found: ${bestMatch.first_name} ${bestMatch.last_name}`);
    console.log(`✓ Similarity: ${(bestSimilarity * 100).toFixed(2)}%`);
    return { employee: bestMatch, similarity: bestSimilarity };
  }

  console.log(`\n✗ No match found above threshold (${(threshold * 100).toFixed(0)}%)`);
  console.log(`Highest similarity was: ${(bestSimilarity * 100).toFixed(2)}%`);
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
