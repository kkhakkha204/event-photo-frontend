'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';

interface SearchResult {
  image_id: number;
  url: string;
  matches?: number;
  confidence: number;
  min_distance: number;
  avg_distance: number;
  face_count: number;
  optimized_urls?: {
    thumbnail?: string;
    preview?: string;
    display?: string;
  };
}

interface GalleryImage {
  id: number;
  url: string;
  uploaded_at?: string;
  thumbnail?: string;
  preview?: string;
}

type SearchMode = 'strict' | 'balanced' | 'loose';

// Component cho lazy loading image
const LazyImage = ({ src, alt, confidence }: { src: string; alt: string; confidence?: number | null }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string>('/placeholder.jpg');
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return (
    <div ref={imgRef} className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-xl" />
      )}
      
      <Image
        src={imageSrc}
        alt={alt}
        width={300}
        height={300}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={() => setIsLoading(false)}
        unoptimized
        loading="lazy"
      />
      
      {confidence !== null && confidence !== undefined && !isLoading && (
        <div className="absolute top-2 right-2">
          <div className={`px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm border ${
            confidence >= 0.8 
              ? 'bg-green-500/90 text-white border-green-400/50' 
              : confidence >= 0.6
              ? 'bg-yellow-500/90 text-white border-yellow-400/50'
              : 'bg-orange-500/90 text-white border-orange-400/50'
          }`}>
            {Math.round(confidence * 100)}%
          </div>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string>('');
  const [mode, setMode] = useState<SearchMode>('balanced');
  const [showResults, setShowResults] = useState(false);
  
  // Gallery states
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [displayedImages, setDisplayedImages] = useState<GalleryImage[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 30;
  
  // Ref cho infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    loadGalleryImages();
  }, []);

  // Load images với pagination
  const loadGalleryImages = async () => {
    setLoadingGallery(true);
    try {
      const response = await api.getAllImages(0, 500); // Load max 500 để tránh lag
      setGalleryImages(response.images);
      setTotal(response.total);
      // Chỉ hiển thị 30 ảnh đầu tiên
      setDisplayedImages(response.images.slice(0, ITEMS_PER_PAGE));
      setPage(1);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoadingGallery(false);
    }
  };

  // Load more images khi scroll
  const loadMoreImages = useCallback(() => {
    if (isLoadingMore || showResults) return;
    
    setIsLoadingMore(true);
    setTimeout(() => {
      const nextPage = page + 1;
      const startIndex = page * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const newImages = galleryImages.slice(startIndex, endIndex);
      
      if (newImages.length > 0) {
        setDisplayedImages(prev => [...prev, ...newImages]);
        setPage(nextPage);
      }
      setIsLoadingMore(false);
    }, 300);
  }, [page, galleryImages, isLoadingMore, showResults]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          loadMoreImages();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current && !showResults) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadMoreImages, showResults, isLoadingMore]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        setError('File quá lớn. Vui lòng chọn ảnh dưới 10MB');
        return;
      }
      
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setError('');
      setResults([]);
      setShowResults(false);
    }
  };

  // Cleanup preview URL khi component unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleSearch = async () => {
    if (!selectedFile) return;

    setSearching(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search?mode=${mode}`, {
        method: 'POST',
        body: formData
      });
      const response = await res.json();
      
      if (response.success) {
        setResults(response.results);
        setShowResults(true);
        if (response.results.length === 0) {
          setError('Không tìm thấy ảnh nào có khuôn mặt tương tự');
        }
      } else {
        setError(response.message || 'Có lỗi xảy ra');
      }
    } catch {
      setError('Không thể kết nối với server');
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    setResults([]);
    setShowResults(false);
    setError('');
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMode(e.target.value as SearchMode);
  };

  const getModeDescription = (modeType: SearchMode) => {
    const descriptions = {
      strict: 'Độ chính xác cao, kết quả ít nhưng đáng tin cậy',
      balanced: 'Cân bằng giữa độ chính xác và số lượng kết quả',
      loose: 'Tìm kiếm rộng, nhiều kết quả có thể liên quan'
    };
    return descriptions[modeType];
  };

  // Get images to display
  const imagesToShow = showResults ? results : displayedImages;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Simple background - giảm animation để tăng performance */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-teal-400/20 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="relative backdrop-blur-sm bg-white/80 border-b border-white/20 shadow-lg">
        <div className="container mx-auto px-4 py-8 lg:py-12">
          <div className="text-center space-y-4">
            <h1 className="text-3xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
              Kho Ảnh Sự Kiện
            </h1>
            <p className="text-lg text-gray-600">
              {showResults 
                ? `Tìm thấy ${results.length} ảnh phù hợp`
                : `${total.toLocaleString()} khoảnh khắc đáng nhớ`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8">
            
            {/* Upload Section - Simplified */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-center">Tìm ảnh của bạn</h2>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Upload Area */}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label 
                    htmlFor="file-upload"
                    className={`block w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors
                      ${selectedFile ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-gray-600 font-medium">
                        {selectedFile ? selectedFile.name : 'Nhấp để tải ảnh lên'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG (MAX. 10MB)</p>
                    </div>
                  </label>
                </div>

                {/* Preview */}
                {previewUrl && (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-xl"
                    />
                    <button
                      onClick={clearSearch}
                      className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Mode Selection - Simplified */}
              {selectedFile && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex justify-center gap-4">
                    {(['strict', 'balanced', 'loose'] as SearchMode[]).map((modeType) => (
                      <label key={modeType} className="cursor-pointer">
                        <input
                          type="radio"
                          name="mode"
                          value={modeType}
                          checked={mode === modeType}
                          onChange={handleModeChange}
                          className="sr-only"
                        />
                        <div className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                          mode === modeType 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          {modeType === 'strict' && 'Chính xác'}
                          {modeType === 'balanced' && 'Cân bằng'}
                          {modeType === 'loose' && 'Tìm nhiều'}
                        </div>
                      </label>
                    ))}
                  </div>
                  
                  <div className="text-center">
                    <button
                      onClick={handleSearch}
                      disabled={searching}
                      className={`px-8 py-3 rounded-xl font-medium text-white transition-all
                        ${searching 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                        }`}
                    >
                      {searching ? 'Đang tìm kiếm...' : 'Tìm kiếm'}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Image Grid - Optimized */}
        {loadingGallery ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Đang tải ảnh...</p>
          </div>
        ) : (
          <div>
            {showResults && (
              <div className="text-center mb-6">
                <button
                  onClick={clearSearch}
                  className="px-6 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ← Quay lại
                </button>
              </div>
            )}
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {imagesToShow.map((image, index) => {
                const imageId = 'image_id' in image ? image.image_id : image.id;
                const imageUrl = image.url;
                const confidence = 'confidence' in image ? image.confidence : null;
                
                return (
                  <div key={`${imageId}-${index}`} className="aspect-square overflow-hidden rounded-xl bg-gray-100">
                    <LazyImage
                      src={imageUrl}
                      alt={`Photo ${imageId}`}
                      confidence={confidence}
                    />
                  </div>
                );
              })}
            </div>
            
            {/* Load more indicator */}
            {!showResults && displayedImages.length < galleryImages.length && (
              <div ref={loadMoreRef} className="text-center py-8">
                {isLoadingMore && (
                  <div className="inline-flex items-center gap-2 text-gray-600">
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang tải thêm...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}