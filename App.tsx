
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Dimensions, ConversionResult } from './types';

// Helper function to extract dimensions from an SVG file.
// This is more efficient as it reads the file only once.
async function getSvgDimensionsFromFile(file: File): Promise<{ previewUrl: string, dimensions: Dimensions }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const url = e.target?.result as string;
      if (!url) {
        return reject(new Error('파일을 읽는 데 실패했습니다.'));
      }

      // Decode Data URL to get SVG text content.
      let svgText = '';
      try {
        if (url.startsWith('data:image/svg+xml;base64,')) {
          svgText = atob(url.substring('data:image/svg+xml;base64,'.length));
        } else if (url.startsWith('data:image/svg+xml,')) {
          svgText = decodeURIComponent(url.substring('data:image/svg+xml,'.length).replace(/\s/g, ' '));
        } else {
          return reject(new Error('지원하지 않는 SVG Data URL 형식입니다.'));
        }
      } catch (err) {
         return reject(new Error('SVG 데이터를 디코딩하는 데 실패했습니다.'));
      }
      

      // 1. Attempt to parse dimensions from SVG attributes
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, "image/svg+xml");
        const svgElement = doc.querySelector('svg');
        
        if (doc.querySelector('parsererror')) {
          throw new Error("잘못된 SVG 파일 형식입니다.");
        }

        if (svgElement) {
          const getAttrValue = (attr: string): number | null => {
            const value = svgElement.getAttribute(attr);
            if (value) {
              const parsed = parseFloat(value.replace(/px$/, ''));
              if (!isNaN(parsed) && parsed > 0) return parsed;
            }
            return null;
          };

          const width = getAttrValue('width');
          const height = getAttrValue('height');

          if (width && height) {
            return resolve({ previewUrl: url, dimensions: { width, height } });
          }
          
          const viewBox = svgElement.getAttribute('viewBox');
          if (viewBox) {
            const parts = viewBox.trim().split(/[,\s]+/);
            if (parts.length === 4) {
              const vbWidth = parseFloat(parts[2]);
              const vbHeight = parseFloat(parts[3]);
              if (!isNaN(vbWidth) && !isNaN(vbHeight) && vbWidth > 0 && vbHeight > 0) {
                return resolve({ previewUrl: url, dimensions: { width: vbWidth, height: vbHeight } });
              }
            }
          }
        }
      } catch (err: any) {
        console.error("SVG 파싱 오류:", err.message);
      }
      
      // 2. Fallback: Render to an Image object to get dimensions
      console.warn('SVG 속성에서 크기를 확인할 수 없어, 렌더링된 이미지 크기를 사용합니다.');
      const img = new Image();
      img.onload = () => {
        if (img.width > 0 && img.height > 0) {
          resolve({ previewUrl: url, dimensions: { width: img.width, height: img.height } });
        } else {
          reject(new Error('SVG 크기를 확인할 수 없습니다. 파일이 유효한지 확인해주세요.'));
        }
      };
      img.onerror = () => reject(new Error('SVG 미리보기를 로드하는 데 실패했습니다.'));
      img.src = url;
    };

    reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
    reader.readAsDataURL(file);
  });
}


const UploadIcon = () => (
  <svg className="w-12 h-12 mx-auto text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const FileUploader: React.FC<{ onFileSelect: (file: File) => void; }> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${isDragging ? 'border-indigo-500' : 'border-gray-300 dark:border-gray-600'} border-dashed rounded-md transition-colors duration-200`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <div className="space-y-1 text-center">
        <UploadIcon />
        <div className="flex text-sm text-gray-600 dark:text-gray-400">
          <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-slate-800 rounded-md font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
            <span>파일 업로드</span>
            <input ref={fileInputRef} id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/svg+xml" onChange={handleChange} />
          </label>
          <p className="pl-1">또는 드래그 앤 드롭</p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-500">SVG 파일만 가능</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 pt-1">참고: 일부 복잡한 SVG(필터, 외부 글꼴 등)는 정확히 렌더링되지 않을 수 있습니다.</p>
      </div>
    </div>
  );
};

export default function App() {
  const [svgFile, setSvgFile] = useState<File | null>(null);
  const [svgPreviewUrl, setSvgPreviewUrl] = useState<string | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<Dimensions | null>(null);
  const [dpi, setDpi] = useState<number>(300);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  
  useEffect(() => {
    const currentResultUrl = result?.dataUrl;
    return () => {
      if (currentResultUrl && currentResultUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentResultUrl);
      }
    };
  }, [result]);
  
  const resetState = useCallback(() => {
    setSvgFile(null);
    setSvgPreviewUrl(null);
    setOriginalDimensions(null);
    setDpi(300);
    setIsConverting(false);
    setError(null);
    setResult(null);
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    if (file.type !== 'image/svg+xml') {
      setError('오류: SVG 파일만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB
      if (!window.confirm('파일 크기가 10MB를 초과합니다. 변환에 시간이 걸리거나 브라우저가 느려질 수 있습니다. 계속하시겠습니까?')) {
        return;
      }
    }
    
    setError(null);
    setResult(null);
    setSvgFile(file);
    setOriginalDimensions(null);
    setSvgPreviewUrl(null);
    
    try {
      const { previewUrl, dimensions } = await getSvgDimensionsFromFile(file);
      setSvgPreviewUrl(previewUrl);
      setOriginalDimensions(dimensions);
    } catch (e: any) {
      setError(e.message || 'SVG 파일을 처리하는 중 오류가 발생했습니다.');
      resetState();
    }
  }, [resetState]);
  
  const handleConvert = useCallback(async () => {
    if (!svgFile || !svgPreviewUrl || !originalDimensions) return;
    
    setIsConverting(true);
    setError(null);
    setResult(null);

    try {
      const newResult = await new Promise<ConversionResult>((resolve, reject) => {
        const canvas = document.createElement('canvas');
        
        const scale = dpi / 96;
        const newWidth = Math.round(originalDimensions.width * scale);
        const newHeight = Math.round(originalDimensions.height * scale);

        canvas.width = newWidth;
        canvas.height = newHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas context를 생성할 수 없습니다.'));
        }

        ctx.imageSmoothingEnabled = false;
        ctx.imageSmoothingQuality = 'high';

        const img = new Image();
        img.onload = () => {
          // Clear canvas for transparent background support
          ctx.clearRect(0, 0, newWidth, newHeight);
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          
          canvas.toBlob((blob) => {
            if (!blob) {
              return reject(new Error('Canvas에서 Blob을 생성하는 데 실패했습니다.'));
            }
            const blobUrl = URL.createObjectURL(blob);
            const newFileName = svgFile.name.replace(/\.svg$/, '.png');

            resolve({
              dataUrl: blobUrl,
              dimensions: { width: newWidth, height: newHeight },
              fileName: newFileName,
            });
          }, 'image/png');
        };
        img.onerror = () => reject(new Error('SVG 이미지를 로드하는 데 실패했습니다.'));
        img.src = svgPreviewUrl;
      });
      setResult(newResult);
    } catch (e: any) {
      setError(e.message || '이미지 변환 중 오류가 발생했습니다.');
    } finally {
      setIsConverting(false);
    }
  }, [svgFile, svgPreviewUrl, originalDimensions, dpi]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-200">고해상도 SVG 변환기</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            SVG를 논문용 고품질 PNG로 즉시 변환하세요.
          </p>
        </header>

        <main className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 sm:p-8">
          {!svgFile ? (
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">1. 파일 업로드</h2>
              <FileUploader onFileSelect={handleFileSelect} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:items-start">
              {/* Left Column: Preview & Settings */}
              <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">변환 설정</h2>
                    <button onClick={resetState} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">파일 변경</button>
                </div>
                
                <div className="mb-6">
                  <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">원본 SVG 미리보기</p>
                  <div className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-slate-700/50 flex items-center justify-center min-h-[150px]">
                    {svgPreviewUrl ? <img src={svgPreviewUrl} alt="SVG Preview" className="max-w-full max-h-48 object-contain" /> : <p className="text-sm text-gray-500">미리보기 로딩 중...</p>}
                  </div>
                  {originalDimensions && (
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                      원본 크기: {originalDimensions.width}px × {originalDimensions.height}px
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="dpi-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">해상도 (DPI)</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="number"
                        id="dpi-input"
                        value={dpi}
                        onChange={(e) => setDpi(Math.max(1, Number(e.target.value)))}
                        min="1"
                        step="1"
                        className="block w-full flex-1 rounded-none rounded-l-md border-gray-300 dark:border-gray-600 dark:bg-slate-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3"
                        placeholder="300"
                      />
                      <span className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 dark:border-gray-600 dark:bg-slate-800 dark:text-gray-400">DPI</span>
                    </div>
                    <div className="mt-2 flex items-center space-x-2">
                        <button onClick={() => setDpi(300)} className="text-xs px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">300 (표준)</button>
                        <button onClick={() => setDpi(600)} className="text-xs px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">600 (고품질)</button>
                        <button onClick={() => setDpi(1200)} className="text-xs px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">1200 (최고화질)</button>
                    </div>
                  </div>
                  <button
                    onClick={handleConvert}
                    disabled={isConverting || !originalDimensions}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                  >
                    {isConverting ? <><Spinner /> 변환 중...</> : 'PNG로 변환'}
                  </button>
                </div>
              </div>

              {/* Right Column: Result */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">결과</h2>
                <div className={`w-full p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-slate-700/50 flex items-center ${result ? 'justify-start' : 'justify-center'} flex-col min-h-[300px] bg-cover`} style={{backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='6' ry='6' stroke='%23D1D5DB' stroke-width='2' stroke-dasharray='6%2c 14' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e")`}}>
                  {result ? (
                    <div className="text-center">
                      <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">변환된 PNG 미리보기</p>
                      <div className="inline-block p-2 border bg-white shadow-sm" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Crect x='0' y='0' width='8' height='8' fill='%23f0f0f0'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23f0f0f0'/%3E%3Crect x='8' y='0' width='8' height='8' fill='%23ffffff'/%3E%3Crect x='0' y='8' width='8' height='8' fill='%23ffffff'/%3E%3C/svg%3E")`}}>
                         <img src={result.dataUrl} alt="PNG Result" className="max-w-full max-h-48 object-contain" />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        결과 크기: {result.dimensions.width}px × {result.dimensions.height}px
                      </p>
                      <a
                        href={result.dataUrl}
                        download={result.fileName}
                        className="mt-4 inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        다운로드
                      </a>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <p>{isConverting ? '이미지를 생성 중입니다...' : '변환 버튼을 클릭하여 결과를 확인하세요.'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300" role="alert">
              <p>{error}</p>
            </div>
          )}
        </main>
        
        <footer className="text-center mt-8 text-sm text-slate-500 dark:text-slate-400">
          <p>&copy; {new Date().getFullYear()} SVG to High-Res PNG Converter. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
