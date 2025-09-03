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

const LazyImage = ({ src, alt, onClick }: { src: string; alt: string; onClick?: () => void }) => {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.disconnect();
      }
    }, { rootMargin: '50px' });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer" onClick={onClick}>
      {!isLoaded && <div className="w-full h-full bg-gray-200" />}
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover ${isLoaded ? '' : 'opacity-0'}`}
        />
      )}
    </div>
  );
};

export default function EmbedPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [displayedCount, setDisplayedCount] = useState(24);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGalleryImages();
    const sendHeight = () => {
      window.parent.postMessage({ type: 'resize', height: document.body.scrollHeight }, '*');
    };
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isLoadingMore) {
        loadMoreImages();
      }
    }, { rootMargin: '100px' });

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [isLoadingMore, displayedCount, showResults, results.length, galleryImages.length]);

  const loadGalleryImages = async () => {
    try {
      const response = await api.getAllImages(0, 100);
      if (response?.images) {
        setGalleryImages(response.images);
        setTotal(response.total || response.images.length);
      }
    } catch {
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
    setTimeout(() => {
      setDisplayedCount(prev => Math.min(prev + 12, currentImages.length));
      setIsLoadingMore(false);
    }, 200);
  }, [isLoadingMore, displayedCount, showResults, results.length, galleryImages.length]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File phải nhỏ hơn 10MB');
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError('');
    setResults([]);
    setShowResults(false);
    setDisplayedCount(24);
  }, [previewUrl]);

  const handleSearch = async () => {
    if (!selectedFile) return;
    setSearching(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/api/search?mode=balanced`, {
        method: 'POST',
        body: formData
      });
      const response = await res.json();
      
      if (response.success) {
        setResults(response.results);
        setShowResults(true);
        setDisplayedCount(24);
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
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl('');
    setResults([]);
    setShowResults(false);
    setError('');
    setDisplayedCount(24);
  }, [previewUrl]);

  const openImage = useCallback((url: string, index: number) => {
    setSelectedImage(url);
    setSelectedImageIndex(index);
  }, []);

  const closeImage = useCallback(() => {
    setSelectedImage(null);
    setSelectedImageIndex(-1);
  }, []);

  const navigateImage = useCallback((direction: 'prev' | 'next') => {
    const images = showResults ? results : galleryImages;
    if (selectedImageIndex === -1) return;

    const newIndex = direction === 'prev'
      ? (selectedImageIndex > 0 ? selectedImageIndex - 1 : images.length - 1)
      : (selectedImageIndex < images.length - 1 ? selectedImageIndex + 1 : 0);

    setSelectedImage(images[newIndex].url);
    setSelectedImageIndex(newIndex);
  }, [selectedImageIndex, showResults, results, galleryImages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return;
      if (e.key === 'Escape') closeImage();
      else if (e.key === 'ArrowLeft') navigateImage('prev');
      else if (e.key === 'ArrowRight') navigateImage('next');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, closeImage, navigateImage]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const currentImages = showResults ? results : galleryImages;
  const displayedImages = currentImages.slice(0, displayedCount);
  const hasMoreImages = displayedCount < currentImages.length;

  return (
    <div className="min-h-screen bg-[#fffafa] p-4">
      <div className="max-w-7xl mx-auto">
        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Tìm Ảnh Của Bạn</h2>
          <p className="text-sm text-gray-500 mb-6">Upload ảnh chân dung để tìm kiếm trong bộ sưu tập</p>
          
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Upload Area */}
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl ${selectedFile ? 'border-[#EC2789] bg-[#EC2789]/5' : 'border-gray-200 bg-gray-50'}`}>
                <div className="w-16 h-16 mb-3 bg-[#EC2789]/10 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#522E90]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="font-medium text-gray-700">{selectedFile ? selectedFile.name : 'Chọn ảnh chân dung'}</p>
                <p className="text-sm text-gray-500 mt-1">PNG, JPG (tối đa 10MB)</p>
              </div>
            </div>

            {/* Preview */}
            {previewUrl && (
              <div className="relative rounded-xl overflow-hidden shadow-lg bg-[#EC2789]/10 p-1">
                <div className="relative rounded-lg overflow-hidden bg-white">
                  <img src={previewUrl} alt="Preview" className="w-full h-48 object-contain bg-gray-50" />
                  <button onClick={clearSearch} className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full shadow-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
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
                className={`inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-white min-w-[180px] ${searching ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#EC2789] to-[#522E90]'}`}
              >
                {searching ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Đang tìm kiếm...
                  </>
                ) : (
                  'Tìm kiếm'
                )}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-5 p-4 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Gallery Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{showResults ? 'Kết quả tìm kiếm' : 'Thư viện ảnh'}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {showResults ? `Tìm thấy ${results.length} ảnh phù hợp` : `${total} ảnh trong bộ sưu tập`}
                {displayedCount < currentImages.length && ` • Hiển thị ${displayedCount}/${currentImages.length}`}
              </p>
            </div>
            {showResults && results.length > 0 && (
              <button onClick={clearSearch} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
                Xem tất cả
              </button>
            )}
          </div>

          {/* Loading */}
          {loadingGallery ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 border-4 border-[#EC2789]/20 border-t-[#EC2789] rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-600 font-medium mt-5">Đang tải thư viện ảnh</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {displayedImages.map((image, index) => {
                  const imageId = 'image_id' in image ? image.image_id : image.id;
                  return (
                    <LazyImage
                      key={`${imageId}-${index}`}
                      src={image.url}
                      alt={`Photo ${imageId}`}
                      onClick={() => openImage(image.url, index)}
                    />
                  );
                })}
              </div>
              
              {/* Load More */}
              {isLoadingMore && (
                <div className="text-center py-8">
                  <div className="w-5 h-5 border-2 border-[#EC2789]/30 border-t-[#EC2789] rounded-full animate-spin mx-auto"></div>
                </div>
              )}
              
              {hasMoreImages && <div ref={loadMoreRef} className="h-4 mt-4" />}
            </>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={closeImage}>
          <button onClick={closeImage} className="absolute top-4 right-4 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="absolute top-4 left-4 px-3 py-1.5 bg-white/10 rounded-full text-white text-sm">
            {selectedImageIndex + 1} / {currentImages.length}
          </div>
          
          {currentImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); navigateImage('prev'); }}
                className="absolute left-4 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); navigateImage('next'); }}
                className="absolute right-4 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
          
          <img src={selectedImage} alt="Full size" className="max-w-[90vw] max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}