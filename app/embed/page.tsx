'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface SearchResult {
  image_id: number;
  url: string;
  matches: number;
  confidence: number;
  min_distance: number;
  avg_distance: number;
  face_count: number;
}

interface GalleryImage {
  id: number;
  url: string;
  uploaded_at: string;
}

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
      const response = await api.getAllImages(0, 1000);
      setGalleryImages(response.images);
      setTotal(response.total);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoadingGallery(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
      setResults([]);
      setShowResults(false);
    }
  };

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
    setSelectedFile(null);
    setPreviewUrl('');
    setResults([]);
    setShowResults(false);
    setError('');
  };

  const getModeDescription = (modeType: 'strict' | 'balanced' | 'loose') => {
    const descriptions = {
      strict: 'Chính xác',
      balanced: 'Cân bằng',
      loose: 'Tìm rộng'
    };
    return descriptions[modeType];
  };

  const getModeIcon = (modeType: 'strict' | 'balanced' | 'loose') => {
    if (modeType === 'strict') {
      return (
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else if (modeType === 'balanced') {
      return (
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
  };

  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);

  const getCurrentImages = () => {
    return showResults ? results : galleryImages;
  };

  const openImage = (url: string, index: number) => {
    setSelectedImage(url);
    setSelectedImageIndex(index);
  };

  const closeImage = () => {
    setSelectedImage(null);
    setSelectedImageIndex(-1);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
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
  };

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
  }, [selectedImage, selectedImageIndex]);

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
                    <p className="text-xs sm:text-sm text-gray-500 mt-1.5">PNG, JPG (tối đa 10MB)</p>
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

          {/* Search Controls */}
          {selectedFile && (
            <div className="space-y-5 pt-6 border-t border-gray-100 mt-6">
              {/* Mode Selection */}
              <div className="space-y-3">
                <h4 className="text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">Chế độ tìm kiếm</h4>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {(['strict', 'balanced', 'loose'] as const).map((modeType) => (
                    <label key={modeType} className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="mode"
                        value={modeType}
                        checked={mode === modeType}
                        onChange={(e) => setMode(e.target.value as 'strict' | 'balanced' | 'loose')}
                        className="sr-only"
                      />
                      <div className={`relative p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-300 ${
                        mode === modeType 
                          ? 'border-[#EC2789] bg-gradient-to-br from-[#EC2789]/5 to-[#522E90]/5 shadow-md' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                        <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                            mode === modeType 
                              ? 'bg-gradient-to-br from-[#EC2789] to-[#522E90] text-white' 
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {getModeIcon(modeType)}
                          </div>
                          <span className={`text-xs sm:text-sm font-medium transition-colors duration-300 ${
                            mode === modeType ? 'text-[#522E90]' : 'text-gray-600'
                          }`}>
                            {getModeDescription(modeType)}
                          </span>
                        </div>
                        {mode === modeType && (
                          <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#EC2789] rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Search Button */}
              <div className="flex justify-center pt-1">
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

        {/* Gallery Section - White Background */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#EC2789]/10 to-[#522E90]/10 rounded-lg sm:rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#522E90]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-[#522E90]/20 border-t-[#522E90] rounded-full animate-spin" style={{animationDirection: 'reverse'}}></div>
                </div>
              </div>
              <p className="text-sm sm:text-base text-gray-600 font-medium mt-5">Đang tải thư viện ảnh</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1.5">Vui lòng đợi trong giây lát...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {(showResults ? results : galleryImages).map((image, index) => {
                const imageId = 'image_id' in image ? image.image_id : image.id;
                const imageUrl = image.url;
                const confidence = 'confidence' in image ? image.confidence : null;
                
                return (
                  <div 
                    key={imageId} 
                    className="group relative cursor-pointer"
                    onClick={() => openImage(imageUrl, index)}
                    style={{
                      animationDelay: `${index * 0.05}s`,
                      animation: 'fadeInUp 0.6s ease-out forwards',
                      opacity: 0
                    }}
                  >
                    <div className="relative aspect-square overflow-hidden rounded-lg sm:rounded-xl bg-gray-100">
                      <img
                        src={imageUrl}
                        alt={`Photo ${imageId}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      />
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      {/* Confidence Badge */}
                      {showResults && confidence !== null && (
                        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 transform group-hover:scale-110 transition-transform duration-300">
                          <div className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold backdrop-blur-md ${
                            confidence >= 0.8 
                              ? 'bg-gradient-to-r from-green-500/90 to-emerald-500/90 text-white shadow-lg' 
                              : confidence >= 0.6
                              ? 'bg-gradient-to-r from-yellow-500/90 to-amber-500/90 text-white shadow-lg'
                              : 'bg-gradient-to-r from-orange-500/90 to-red-500/90 text-white shadow-lg'
                          }`}>
                            {Math.round(confidence * 100)}%
                          </div>
                        </div>
                      )}
                      
                      {/* View Icon - Desktop Only */}
                      <div className="hidden sm:flex absolute bottom-0 left-0 right-0 p-3 sm:p-4 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-md rounded-lg text-xs font-medium text-gray-900 shadow-lg">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Xem
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={closeImage}>
          <div className="relative w-full h-full flex items-center justify-center px-4 py-16 sm:p-8" onClick={(e) => e.stopPropagation()}>
            {/* Close Button - Fixed Position */}
            <button
              onClick={closeImage}
              className="fixed top-4 right-4 z-10 w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full shadow-lg hover:bg-black/70 transition-all duration-200 flex items-center justify-center border border-white/20"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Navigation Arrows */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateImage('prev');
              }}
              className="absolute left-2 sm:left-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full shadow-lg hover:bg-black/70 transition-all duration-200 flex items-center justify-center border border-white/20"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateImage('next');
              }}
              className="absolute right-2 sm:right-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full shadow-lg hover:bg-black/70 transition-all duration-200 flex items-center justify-center border border-white/20"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Image Container */}
            <div className="max-w-[90vw] max-h-[80vh] flex items-center justify-center">
              <img
                src={selectedImage}
                alt="Full size"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>

            {/* Image Counter */}
            {selectedImageIndex !== -1 && (
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm font-medium border border-white/20">
                {selectedImageIndex + 1} / {getCurrentImages().length}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}