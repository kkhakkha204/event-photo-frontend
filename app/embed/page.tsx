'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';

interface SearchResult {
  image_id: number;
  url: string;
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

// Optimized Image Component with lazy loading
const LazyImage = ({ src, alt, onClick, className }: {
  src: string;
  alt: string;
  onClick: () => void;
  className?: string;
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Generate thumbnail URL (assuming your CDN supports it)
  const thumbnailUrl = useMemo(() => {
    if (src.includes('cloudinary')) {
      return src.replace('/upload/', '/upload/w_300,h_300,c_fill,f_auto,q_auto/');
    }
    return src;
  }, [src]);

  return (
    <div 
      className={`relative aspect-square overflow-hidden rounded-lg bg-gray-100 cursor-pointer ${className}`}
      onClick={onClick}
    >
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      )}
      <img
        src={thumbnailUrl}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        loading="lazy"
      />
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
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const ITEMS_PER_PAGE = 24; // Reduced from 100

  // Memoized current images to avoid recalculation
  const currentImages = useMemo(() => {
    return showResults ? results : galleryImages;
  }, [showResults, results, galleryImages]);

  // Load gallery images with pagination
  const loadGalleryImages = useCallback(async (pageNum = 0, append = false) => {
    if (!append) setLoadingGallery(true);
    
    try {
      const response = await api.getAllImages(pageNum * ITEMS_PER_PAGE, ITEMS_PER_PAGE);
      
      if (response?.images && Array.isArray(response.images)) {
        setGalleryImages(prev => append ? [...prev, ...response.images] : response.images);
        setTotal(response.total || response.images.length);
        setHasMore(response.has_more || false);
      } else {
        if (!append) {
          setGalleryImages([]);
          setTotal(0);
        }
        setError('Không thể tải thư viện ảnh');
      }
    } catch (error) {
      console.error('Error loading images:', error);
      if (!append) {
        setGalleryImages([]);
        setTotal(0);
      }
      setError('Lỗi kết nối với server');
    } finally {
      if (!append) setLoadingGallery(false);
    }
  }, []);

  // Load more images
  const loadMore = useCallback(() => {
    if (!loadingGallery && hasMore && !showResults) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadGalleryImages(nextPage, true);
    }
  }, [loadingGallery, hasMore, showResults, page, loadGalleryImages]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  // Initial load
  useEffect(() => {
    loadGalleryImages();
  }, [loadGalleryImages]);

  // Resize observer for iframe
  useEffect(() => {
    const sendHeight = () => {
      const height = document.body.scrollHeight;
      window.parent.postMessage({ type: 'resize', height }, '*');
    };
    
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.body);
    
    return () => observer.disconnect();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
      setResults([]);
      setShowResults(false);
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!selectedFile) return;

    setSearching(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/api/search?mode=balanced&limit=600`, {
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
  }, [selectedFile]);

  const clearSearch = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl('');
    setResults([]);
    setShowResults(false);
    setError('');
  }, []);

  const openImage = useCallback((url: string) => {
    setSelectedImage(url);
  }, []);

  const closeImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImage && e.key === 'Escape') {
        closeImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, closeImage]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Tìm Ảnh Của Bạn</h2>
            <p className="text-sm text-gray-500 mt-1">Upload ảnh chân dung để tìm kiếm</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Upload Area */}
            <div>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="file-upload-embed"
                />
                <label 
                  htmlFor="file-upload-embed"
                  className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer ${
                    selectedFile ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="text-center p-4">
                    <div className="w-16 h-16 mb-3 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="font-medium text-gray-700">
                      {selectedFile ? selectedFile.name : 'Chọn ảnh chân dung'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">PNG, JPG (tối đa 10MB)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Preview */}
            {previewUrl && (
              <div className="relative">
                <div className="relative rounded-lg overflow-hidden shadow-lg">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-48 object-contain bg-gray-50"
                  />
                  <button
                    onClick={clearSearch}
                    className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center"
                  >
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
            <div className="flex justify-center pt-6 mt-6 border-t">
              <button
                onClick={handleSearch}
                disabled={searching}
                className={`px-8 py-3 rounded-lg font-semibold text-white min-w-[180px] ${
                  searching ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {searching ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang tìm...
                  </div>
                ) : (
                  'Tìm kiếm'
                )}
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Gallery Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {showResults ? 'Kết quả tìm kiếm' : 'Thư viện ảnh'}
              </h3>
              <p className="text-sm text-gray-500">
                {showResults 
                  ? `${results.length} ảnh phù hợp`
                  : `${total} ảnh trong bộ sưu tập`
                }
              </p>
            </div>

            {showResults && (
              <button
                onClick={clearSearch}
                className="px-4 py-2 bg-gray-100 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Xem tất cả
              </button>
            )}
          </div>

          {/* Image Grid */}
          {loadingGallery && galleryImages.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
              <p className="text-gray-600 mt-4">Đang tải thư viện ảnh...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {currentImages.map((image, index) => {
                  const imageId = 'image_id' in image ? image.image_id : image.id;
                  const imageUrl = image.url;
                  
                  return (
                    <LazyImage
                      key={`${imageId}-${index}`}
                      src={imageUrl}
                      alt={`Photo ${imageId}`}
                      onClick={() => openImage(imageUrl)}
                    />
                  );
                })}
              </div>

              {/* Load More Button */}
              {!showResults && hasMore && (
                <div className="text-center mt-8">
                  <button
                    onClick={loadMore}
                    disabled={loadingGallery}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {loadingGallery ? 'Đang tải...' : 'Tải thêm'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={closeImage}>
          <button
            onClick={closeImage}
            className="absolute top-4 right-4 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
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