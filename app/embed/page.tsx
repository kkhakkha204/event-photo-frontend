'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';

interface SearchResult {
  image_id: number;
  url: string;
  matches?: number;
  confidence: number;
  min_distance: number;
  avg_distance: number;
  face_count: number;
  uploaded_at?: string;
}

interface GalleryImage {
  id: number;
  url: string;
  uploaded_at?: string;
  face_count?: number;
  event_id?: number;
  processed?: number;
}

// LazyImage Component with IntersectionObserver
const LazyImage = ({ 
  src, 
  alt, 
  className, 
  onClick,
  confidence 
}: { 
  src: string; 
  alt: string; 
  className: string;
  onClick: () => void;
  confidence?: number | null;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: '50px',
        threshold: 0.1 
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true);
  }, []);

  return (
    <div 
      ref={imgRef}
      className="group relative cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-square overflow-hidden rounded-lg sm:rounded-xl bg-gray-100">
        {/* Skeleton Loading */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse">
            <div className="absolute inset-4 bg-gray-100 rounded opacity-50"></div>
          </div>
        )}

        {/* Actual Image */}
        {isInView && (
          <>
            {hasError ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            ) : (
              <img
                src={src}
                alt={alt}
                className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
                onLoad={handleLoad}
                onError={handleError}
                loading="lazy"
              />
            )}
          </>
        )}

        {/* Confidence Badge */}
        {confidence !== null && confidence !== undefined && isLoaded && (
          <div className="absolute top-2 right-2 transform group-hover:scale-110 transition-transform duration-300">
            <div className={`px-2 py-1 rounded-full text-[10px] font-semibold backdrop-blur-md ${
              confidence >= 0.8 
                ? 'bg-green-500/90 text-white' 
                : confidence >= 0.6
                ? 'bg-yellow-500/90 text-white'
                : 'bg-orange-500/90 text-white'
            }`}>
              {Math.round(confidence * 100)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Virtual Grid Component
const VirtualGrid = ({ 
  items, 
  isResults,
  onImageClick 
}: { 
  items: (SearchResult | GalleryImage)[];
  isResults: boolean;
  onImageClick: (url: string, index: number) => void;
}) => {
  const [visibleCount, setVisibleCount] = useState(24);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (isLoadingMore || visibleCount >= items.length) return;
    
    setIsLoadingMore(true);
    // Debounced loading
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + 12, items.length));
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore, visibleCount, items.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  // Reset visible count when switching between results/gallery
  useEffect(() => {
    setVisibleCount(24);
  }, [isResults]);

  const visibleItems = items.slice(0, visibleCount);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {visibleItems.map((image, index) => {
          const imageId = 'image_id' in image ? image.image_id : image.id;
          const imageUrl = image.url;
          const confidence = 'confidence' in image ? image.confidence : null;
          
          return (
            <LazyImage
              key={`${isResults ? 'result' : 'gallery'}-${imageId}-${index}`}
              src={imageUrl}
              alt={`Photo ${imageId}`}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              onClick={() => onImageClick(imageUrl, index)}
              confidence={confidence}
            />
          );
        })}
      </div>

      {/* Load More Trigger */}
      {visibleCount < items.length && (
        <div ref={loadMoreRef} className="py-8 flex justify-center">
          {isLoadingMore ? (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-[#EC2789]/30 border-t-[#EC2789] rounded-full animate-spin"></div>
              <span className="text-sm text-gray-600">Đang tải thêm ảnh...</span>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Hiển thị {visibleCount} / {items.length} ảnh
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default function EmbedPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string>('');
  const [mode, setMode] = useState<'strict' | 'balanced' | 'loose'>('balanced');
  const [showResults, setShowResults] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Gallery states
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadGalleryImages();
    // Send height to parent
    const sendHeight = () => {
      const height = document.body.scrollHeight;
      window.parent.postMessage({ type: 'resize', height }, '*');
    };
    
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.body);
    
    return () => observer.disconnect();
  }, []);

  const loadGalleryImages = async () => {
    setLoadingGallery(true);
    try {
      const response = await api.getAllImages(0, 100);
      
      if (response && response.images && Array.isArray(response.images)) {
        setGalleryImages(response.images);
        setTotal(response.total || response.images.length);
      } else {
        console.error('Invalid response format:', response);
        setGalleryImages([]);
        setTotal(0);
        setError('Không thể tải thư viện ảnh');
      }
    } catch (error) {
      console.error('Error loading images:', error);
      setGalleryImages([]);
      setTotal(0);
      setError('Lỗi kết nối với server');
    } finally {
      setLoadingGallery(false);
    }
  };

  // File validation
  const validateFile = useCallback((file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (file.size > maxSize) {
      return 'Kích thước file không được vượt quá 10MB';
    }
    
    if (!allowedTypes.includes(file.type)) {
      return 'Chỉ hỗ trợ định dạng JPG, PNG, WEBP';
    }
    
    return null;
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Cleanup previous preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError('');
    setResults([]);
    setShowResults(false);
  }, [validateFile, previewUrl]);

  const handleSearch = async () => {
    if (!selectedFile) return;

    setSearching(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/api/search?mode=${mode}`, {
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

  const clearSearch = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    setResults([]);
    setShowResults(false);
    setError('');
  }, [previewUrl]);

  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);

  const getCurrentImages = useCallback(() => {
    return showResults ? results : galleryImages;
  }, [showResults, results, galleryImages]);

  const openImage = useCallback((url: string, index: number) => {
    setSelectedImage(url);
    setSelectedImageIndex(index);
  }, []);

  const closeImage = useCallback(() => {
    setSelectedImage(null);
    setSelectedImageIndex(-1);
  }, []);

  const navigateImage = useCallback((direction: 'prev' | 'next') => {
    const images = getCurrentImages();
    if (selectedImageIndex === -1) return;

    let newIndex = selectedImageIndex;
    if (direction === 'prev') {
      newIndex = selectedImageIndex > 0 ? selectedImageIndex - 1 : images.length - 1;
    } else {
      newIndex = selectedImageIndex < images.length - 1 ? selectedImageIndex + 1 : 0;
    }

    const newImage = images[newIndex];
    const newUrl = newImage.url;
    setSelectedImage(newUrl);
    setSelectedImageIndex(newIndex);
  }, [getCurrentImages, selectedImageIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return;
      
      if (e.key === 'Escape') {
        closeImage();
      } else if (e.key === 'ArrowLeft') {
        navigateImage('prev');
      } else if (e.key === 'ArrowRight') {
        navigateImage('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, selectedImageIndex, closeImage, navigateImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Format date safely
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('vi-VN');
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="min-h-screen bg-[#fffafa] p-3 sm:p-4 lg:p-6">
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#EC2789] via-transparent to-[#522E90]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Search Section */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="relative">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#EC2789] to-[#522E90] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-[#EC2789] rounded-full animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                Tìm Ảnh Của Bạn
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Upload ảnh chân dung để tìm kiếm trong bộ sưu tập</p>
            </div>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Upload Area */}
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  id="file-upload-embed"
                />
                <label 
                  htmlFor="file-upload-embed"
                  className={`relative flex flex-col items-center justify-center w-full h-40 sm:h-48
                    border-2 border-dashed rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-300
                    ${selectedFile 
                      ? 'border-[#EC2789] bg-gradient-to-br from-[#EC2789]/5 to-[#522E90]/5' 
                      : 'border-gray-200 hover:border-[#EC2789]/50 bg-gray-50 hover:bg-gradient-to-br hover:from-[#EC2789]/5 hover:to-[#522E90]/5'
                    }`}
                >
                  <div className="flex flex-col items-center justify-center p-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 mb-3 bg-gradient-to-br from-[#EC2789]/10 to-[#522E90]/10 rounded-xl sm:rounded-2xl flex items-center justify-center">
                      <svg className="w-7 h-7 sm:w-8 sm:h-8 text-[#522E90]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="text-sm sm:text-base font-medium text-gray-700">
                      {selectedFile ? selectedFile.name : 'Chọn ảnh chân dung'}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1.5">PNG, JPG, WEBP (tối đa 10MB)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Preview */}
            {previewUrl && (
              <div className="space-y-3">
                <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-[#EC2789]/10 to-[#522E90]/10 p-1">
                  <div className="relative rounded-lg sm:rounded-xl overflow-hidden bg-white">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-40 sm:h-48 object-contain bg-gray-50"
                    />
                    <button
                      onClick={clearSearch}
                      className="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-200 flex items-center justify-center"
                    >
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#EC2789]/10 to-[#522E90]/10 text-[#522E90] rounded-full text-xs sm:text-sm font-medium">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Sẵn sàng tìm kiếm
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Search Button */}
          {selectedFile && (
            <div className="flex justify-center pt-6 mt-6 border-t border-gray-100">
              <button
                onClick={handleSearch}
                disabled={searching}
                className={`relative inline-flex items-center justify-center px-6 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold text-white
                  transition-all duration-300 min-w-[160px] sm:min-w-[180px] shadow-lg
                  ${searching 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-[#EC2789] to-[#522E90] hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                  }`}
              >
                {searching ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Đang tìm kiếm...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Tìm kiếm</span>
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-5 p-3 sm:p-4 bg-red-50 border border-red-100 rounded-lg sm:rounded-xl">
              <div className="flex items-start gap-2.5">
                <div className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-xs sm:text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Gallery Section */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#EC2789]/10 to-[#522E90]/10 rounded-lg sm:rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#522E90]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
                  {showResults ? 'Kết quả tìm kiếm' : 'Thư viện ảnh'}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  {showResults 
                    ? `Tìm thấy ${results.length} ảnh phù hợp`
                    : `${total} ảnh trong bộ sưu tập`
                  }
                </p>
              </div>
            </div>

            {showResults && results.length > 0 && (
              <button
                onClick={clearSearch}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
                <span className="hidden sm:inline">Xem tất cả</span>
              </button>
            )}
          </div>

          {/* Image Grid */}
          {loadingGallery ? (
            <div className="text-center py-16 sm:py-20">
              <div className="relative inline-flex">
                <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-[#EC2789]/20 border-t-[#EC2789] rounded-full animate-spin"></div>
              </div>
              <p className="text-sm sm:text-base text-gray-600 font-medium mt-5">Đang tải thư viện ảnh</p>
            </div>
          ) : (
            <VirtualGrid 
              items={showResults ? results : galleryImages}
              isResults={showResults}
              onImageClick={openImage}
            />
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={closeImage}>
          {/* Navigation arrows */}
          {getCurrentImages().length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); navigateImage('prev'); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={(e) => { e.stopPropagation(); navigateImage('next'); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Close button */}
          <button
            onClick={closeImage}
            className="absolute top-4 right-4 z-10 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image counter */}
          {getCurrentImages().length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full">
              <span className="text-white text-sm">
                {selectedImageIndex + 1} / {getCurrentImages().length}
              </span>
            </div>
          )}
          
          <img
            src={selectedImage}
            alt="Full size"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}