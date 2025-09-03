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

// Lazy Loading Image Component
interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

const LazyImage = ({ src, alt, className, onClick }: LazyImageProps) => {
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
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <div 
      ref={imgRef}
      className={`relative ${className}`}
      onClick={onClick}
    >
      {/* Skeleton Loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      
      {/* Actual Image */}
      {isInView && (
        <>
          {hasError ? (
            <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.734 0L4.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          ) : (
            <img
              src={src}
              alt={alt}
              onLoad={handleLoad}
              onError={handleError}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}
        </>
      )}
    </div>
  );
};

// Load More Indicator Component
const LoadMoreIndicator = ({ isLoading }: { isLoading: boolean }) => {
  if (!isLoading) return null;
  
  return (
    <div className="col-span-full flex justify-center py-8">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-[#EC2789]/30 border-t-[#EC2789] rounded-full animate-spin"></div>
        <span className="text-sm text-gray-600">Đang tải thêm ảnh...</span>
      </div>
    </div>
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
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  
  // Virtual Scrolling States
  const [displayedCount, setDisplayedCount] = useState(24); // Initial load: 24 images
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const LOAD_MORE_COUNT = 12; // Load 12 more each time

  useEffect(() => {
    loadGalleryImages();
    const sendHeight = () => {
      const height = document.body.scrollHeight;
      window.parent.postMessage({ type: 'resize', height }, '*');
    };
    
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.body);
    
    return () => observer.disconnect();
  }, []);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoadingMore) {
          loadMoreImages();
        }
      },
      { rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [isLoadingMore, displayedCount, showResults, results.length, galleryImages.length]);

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

  const loadMoreImages = useCallback(() => {
    if (isLoadingMore) return;
    
    const currentImages = showResults ? results : galleryImages;
    if (displayedCount >= currentImages.length) return;

    setIsLoadingMore(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      setDisplayedCount(prev => Math.min(prev + LOAD_MORE_COUNT, currentImages.length));
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore, displayedCount, showResults, results.length, galleryImages.length]);

  // File validation
  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
      return 'Chỉ hỗ trợ file ảnh (JPG, PNG, WebP)';
    }
    
    if (file.size > maxSize) {
      return 'File ảnh phải nhỏ hơn 10MB';
    }
    
    return null;
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
      setDisplayedCount(24); // Reset display count
    }
  }, [previewUrl]);

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
        setDisplayedCount(24); // Reset display count for results
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
    // Cleanup preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    
    setSelectedFile(null);
    setPreviewUrl('');
    setResults([]);
    setShowResults(false);
    setError('');
    setDisplayedCount(24); // Reset display count
  }, [previewUrl]);

  const getCurrentImages = () => {
    return showResults ? results : galleryImages;
  };

  const getDisplayedImages = () => {
    const currentImages = getCurrentImages();
    return currentImages.slice(0, displayedCount);
  };

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
  }, [selectedImageIndex]);

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
  }, [selectedImage, closeImage, navigateImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const currentImages = getCurrentImages();
  const displayedImages = getDisplayedImages();
  const hasMoreImages = displayedCount < currentImages.length;

  return (
    <div className="min-h-screen bg-[#fffafa] p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
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
                    border-2 border-dashed rounded-xl cursor-pointer transition-colors
                    ${selectedFile 
                      ? 'border-[#EC2789] bg-[#EC2789]/5' 
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                    }`}
                >
                  <div className="flex flex-col items-center justify-center p-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 mb-3 bg-[#EC2789]/10 rounded-xl flex items-center justify-center">
                      <svg className="w-7 h-7 sm:w-8 sm:h-8 text-[#522E90]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="text-sm sm:text-base font-medium text-gray-700">
                      {selectedFile ? selectedFile.name : 'Chọn ảnh chân dung'}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1.5">PNG, JPG (tối đa 10MB)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Preview */}
            {previewUrl && (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden shadow-lg bg-[#EC2789]/10 p-1">
                  <div className="relative rounded-lg overflow-hidden bg-white">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-40 sm:h-48 object-contain bg-gray-50"
                    />
                    <button
                      onClick={clearSearch}
                      className="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 bg-white/90 rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
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
                className={`inline-flex items-center justify-center px-6 py-3 sm:px-8 sm:py-4 rounded-xl text-sm sm:text-base font-semibold text-white min-w-[160px] sm:min-w-[180px] shadow-lg transition-all
                  ${searching 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-[#EC2789] to-[#522E90] hover:shadow-xl transform hover:scale-[1.02]'
                  }`}
              >
                {searching ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Đang tìm kiếm...</span>
                  </div>
                ) : (
                  <span>Tìm kiếm</span>
                )}
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-5 p-3 sm:p-4 bg-red-50 border border-red-100 rounded-lg">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center">
              <div>
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
                  {showResults ? 'Kết quả tìm kiếm' : 'Thư viện ảnh'}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  {showResults 
                    ? `Tìm thấy ${results.length} ảnh phù hợp`
                    : `${total} ảnh trong bộ sưu tập`
                  }
                  {displayedCount < currentImages.length && (
                    <span className="ml-2">• Hiển thị {displayedCount}/{currentImages.length}</span>
                  )}
                </p>
              </div>
            </div>

            {showResults && results.length > 0 && (
              <button
                onClick={clearSearch}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
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
          ) : currentImages.length === 0 ? (
            <div className="text-center py-16 sm:py-20">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500">
                {showResults ? 'Không tìm thấy ảnh phù hợp' : 'Chưa có ảnh nào trong thư viện'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {displayedImages.map((image, index) => {
                  const imageId = 'image_id' in image ? image.image_id : image.id;
                  const imageUrl = image.url;
                  
                  return (
                    <div 
                      key={`${imageId}-${index}`}
                      className="relative cursor-pointer group"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 group-hover:shadow-lg transition-shadow duration-200">
                        <LazyImage
                          src={imageUrl}
                          alt={`Photo ${imageId}`}
                          className="absolute inset-0"
                          onClick={() => openImage(imageUrl, index)}
                        />
                      </div>
                    </div>
                  );
                })}
                
                {/* Load More Indicator */}
                {hasMoreImages && <LoadMoreIndicator isLoading={isLoadingMore} />}
              </div>
              
              {/* Load More Trigger */}
              {hasMoreImages && (
                <div ref={loadMoreRef} className="h-4 mt-4" />
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={closeImage}>
          <button
            onClick={closeImage}
            className="absolute top-4 right-4 z-10 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image Counter */}
          <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-white/10 rounded-full text-white text-sm">
            {selectedImageIndex + 1} / {currentImages.length}
          </div>
          
          {/* Navigation Arrows */}
          {currentImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateImage('prev');
                }}
                className="absolute left-4 z-10 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateImage('next');
                }}
                className="absolute right-4 z-10 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
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