declare global {
  interface Window {
    cv: any;
  }
}

let cvLoaded = false;
let cvLoadingPromise: Promise<void> | null = null;

export const loadOpenCV = (): Promise<void> => {
  if (cvLoaded) {
    return Promise.resolve();
  }

  if (cvLoadingPromise) {
    return cvLoadingPromise;
  }

  cvLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
    script.async = true;
    
    script.onload = () => {
      // OpenCV needs a moment to initialize
      const checkCV = setInterval(() => {
        if (window.cv && window.cv.Mat) {
          clearInterval(checkCV);
          cvLoaded = true;
          console.log('OpenCV.js loaded successfully');
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkCV);
        if (!cvLoaded) {
          reject(new Error('OpenCV.js failed to initialize'));
        }
      }, 30000);
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load OpenCV.js'));
    };
    
    document.head.appendChild(script);
  });

  return cvLoadingPromise;
};

export const isOpenCVLoaded = (): boolean => cvLoaded;
