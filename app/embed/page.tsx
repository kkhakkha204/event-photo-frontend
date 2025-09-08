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
      className={`relative aspect-square overflow-hidden rounded-xl bg-gray-50 cursor-pointer hover:shadow-md transition-shadow duration-200 ${className}`}
      onClick={onClick}
    >
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
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
    <div className="min-h-screen bg-gray-50 p-2 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Upload & Example */}
            <div className="space-y-6">
              {/* Upload Area with Example Side by Side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Upload Zone */}
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
                    className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      selectedFile 
                        ? 'border-blue-400 bg-blue-50' 
                        : 'border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-25'
                    }`}
                  >
                    <div className="text-center p-4">
                      {selectedFile ? (
                        <>
                          <div className="w-12 h-12 mb-2 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="font-medium text-sm text-gray-800 mb-1 truncate max-w-[150px] mx-auto">{selectedFile.name}</p>
                          <p className="text-xs text-blue-600">Sẵn sàng tìm kiếm</p>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 mb-2 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <p className="font-medium text-sm text-gray-700 mb-1">Tải ảnh lên</p>
                          <p className="text-xs text-gray-500">Click hoặc kéo thả</p>
                          <p className="text-xs text-gray-400 mt-1">PNG, JPG (max 10MB)</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>

                {/* Example Image */}
                <div className="flex flex-col">
                  <div className="bg-green-50 rounded-xl p-3 h-48 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-semibold text-green-700">Ảnh mẫu tốt</span>
                    </div>
                    <div className="flex-1 relative">
                      <img 
                        src="/placeholder.png" 
                        alt="Ảnh mẫu" 
                        className="w-full h-full object-cover rounded-lg border border-green-200"
                      />
                      <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded text-center">
                        Chân dung cận cảnh
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips Section */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <h4 className="font-semibold text-blue-800 mb-3 text-sm flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Để có kết quả tốt nhất
                </h4>
                <ul className="space-y-1.5 text-xs text-blue-700">
                  <li className="flex items-start">
                    <span className="inline-block w-1 h-1 bg-green-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                    <span><strong>Chụp từ ngực trở lên</strong> - ảnh cận cảnh cho kết quả tốt nhất</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-1 h-1 bg-green-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                    <span><strong>Ảnh rõ nét</strong> - tránh ảnh mờ hoặc độ phân giải thấp</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-1 h-1 bg-blue-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                    <span>Nhìn thẳng về phía camera, khuôn mặt không bị che</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-1 h-1 bg-blue-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                    <span>Ánh sáng đều, tránh quá tối hoặc quá sáng</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Column - Preview & Search */}
            <div className="space-y-4">
              {previewUrl ? (
                <>
                  {/* Preview Image */}
                  <div className="relative rounded-xl overflow-hidden shadow-lg bg-white">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-64 object-contain bg-gray-50"
                    />
                    <button
                      onClick={clearSearch}
                      className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white"
                      title="Xóa ảnh"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Search Button */}
                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all ${
                      searching 
                        ? 'bg-gray-300 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {searching ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Đang tìm kiếm...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Tìm kiếm ảnh
                      </div>
                    )}
                  </button>
                </>
              ) : (
                /* Placeholder when no image selected */
                <div className="h-full flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 min-h-[320px]">
                  <div className="text-center p-6">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500 font-medium mb-2">Xem trước ảnh</p>
                    <p className="text-gray-400 text-sm">Tải ảnh lên để bắt đầu tìm kiếm</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                  {error.includes('Không tìm thấy') && (
                    <p className="text-xs text-red-600 mt-1">
                      Thử sử dụng ảnh chân dung cận cảnh và rõ nét hơn để có kết quả tốt nhất
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Gallery Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                {showResults ? 'Kết quả tìm kiếm' : 'Thư viện ảnh'}
              </h2>
              <p className="text-sm text-gray-500">
                {showResults 
                  ? `Tìm thấy ${results.length} ảnh phù hợp`
                  : `Tổng cộng ${total.toLocaleString()} ảnh trong bộ sưu tập`
                }
              </p>
            </div>

            {showResults && (
              <button
                onClick={clearSearch}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Xem tất cả
                </div>
              </button>
            )}
          </div>

          {/* Image Grid */}
          {loadingGallery && galleryImages.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Đang tải thư viện ảnh...</p>
              <p className="text-gray-400 text-sm mt-1">Vui lòng đợi trong giây lát</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                {currentImages.map((image, index) => {
                  const imageId = 'image_id' in image ? image.image_id : image.id;
                  const imageUrl = image.url;
                  
                  return (
                    <LazyImage
                      key={`${imageId}-${index}`}
                      src={imageUrl}
                      alt={`Ảnh ${imageId}`}
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
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                      loadingGallery
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {loadingGallery ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
                        Đang tải...
                      </div>
                    ) : (
                      'Tải thêm ảnh'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={closeImage}>
          <button
            onClick={closeImage}
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors z-10"
            title="Đóng (ESC)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <img
            src={selectedImage}
            alt="Ảnh phóng to"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}