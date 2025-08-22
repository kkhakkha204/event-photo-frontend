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
      strict: 'Độ chính xác cao',
      balanced: 'Cân bằng tối ưu',
      loose: 'Tìm kiếm rộng'
    };
    return descriptions[modeType];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-3 sm:p-4 lg:p-6">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 right-10 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 left-10 w-40 h-40 bg-purple-400/10 rounded-full blur-2xl"></div>
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* Search Section */}
        <div className="backdrop-blur-sm bg-white/80 rounded-2xl shadow-lg shadow-black/5 border border-white/20 p-4 sm:p-6 lg:p-8 mb-6 lg:mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-xl shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                Tìm Ảnh Của Bạn
              </h2>
              <p className="text-sm text-gray-600 mt-1">Upload ảnh chân dung để tìm kiếm khoảnh khắc có bạn</p>
            </div>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            {/* Upload Area */}
            <div className="space-y-4">
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
                  className={`relative flex flex-col items-center justify-center w-full h-36 sm:h-40
                    border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300
                    ${selectedFile 
                      ? 'border-blue-400 bg-blue-50/50' 
                      : 'border-gray-300 hover:border-blue-400 bg-gray-50/50 hover:bg-blue-50/30'
                    }`}
                >
                  <div className="flex flex-col items-center justify-center p-4">
                    <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-sm text-gray-600 font-medium text-center">
                      {selectedFile ? selectedFile.name : 'Chọn ảnh chân dung'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG (MAX. 10MB)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Preview */}
            {previewUrl && (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-xl shadow-lg">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-36 sm:h-40 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  <button
                    onClick={clearSearch}
                    className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-all duration-200"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="text-center">
                  <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    ✓ Sẵn sàng tìm kiếm
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Search Controls */}
          {selectedFile && (
            <div className="space-y-4 pt-6 border-t border-gray-200/60 mt-6">
              {/* Mode Selection */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900">Chế độ tìm kiếm</h4>
                <div className="grid grid-cols-3 gap-2">
                  {(['strict', 'balanced', 'loose'] as const).map((modeType) => (
                    <label key={modeType} className={`relative flex flex-col p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      mode === modeType 
                        ? 'border-blue-500 bg-blue-50 shadow-sm' 
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}>
                      <input
                        type="radio"
                        name="mode"
                        value={modeType}
                        checked={mode === modeType}
                        onChange={(e) => setMode(e.target.value as 'strict' | 'balanced' | 'loose')}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-900">
                          {getModeDescription(modeType)}
                        </span>
                        <div className={`w-3 h-3 rounded-full border ${
                          mode === modeType 
                            ? 'border-blue-500 bg-blue-500' 
                            : 'border-gray-300'
                        }`}>
                          {mode === modeType && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Search Button */}
              <div className="text-center pt-2">
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className={`relative inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-white
                    transition-all duration-300 shadow-lg min-w-[140px]
                    ${searching 
                      ? 'bg-gray-400 cursor-not-allowed scale-95' 
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 hover:shadow-xl hover:scale-105 active:scale-95'
                    }`}
                >
                  {searching && (
                    <div className="absolute left-4">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <span className={searching ? 'ml-4' : ''}>
                    {searching ? 'Đang tìm...' : 'Tìm kiếm'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="relative p-3 bg-red-50 border border-red-200 rounded-lg mt-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-4 h-4 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-2">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-gray-500 to-gray-600 rounded-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg lg:text-xl font-bold text-gray-900">
                {showResults 
                  ? `Kết quả tìm kiếm`
                  : `Thư viện ảnh sự kiện`
                }
              </h3>
              <p className="text-sm text-gray-600">
                {showResults 
                  ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-xs font-medium">
                          {results.length}
                        </span>
                        ảnh khớp với khuôn mặt
                      </span>
                    )
                  : (
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full text-xs font-medium">
                          {total}
                        </span>
                        ảnh trong bộ sưu tập
                      </span>
                    )
                }
              </p>
            </div>
          </div>

          {showResults && results.length > 0 && (
            <button
              onClick={clearSearch}
              className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm text-sm"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              Xem tất cả
            </button>
          )}
        </div>

        {/* Image Grid */}
        {loadingGallery ? (
          <div className="text-center py-12 lg:py-16">
            <div className="relative mb-4">
              <div className="w-12 h-12 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 border-3 border-purple-200 border-t-purple-500 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
            </div>
            <p className="text-gray-600 font-medium">Đang tải ảnh...</p>
            <p className="text-sm text-gray-500 mt-1">Vui lòng đợi trong giây lát</p>
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
                  className="group relative"
                  style={{
                    animationDelay: `${index * 0.03}s`,
                    animation: 'fadeInUp 0.5s ease-out forwards',
                    opacity: 0,
                    transform: 'translateY(15px)'
                  }}
                >
                  <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 shadow-sm group-hover:shadow-lg transition-all duration-300">
                    <img
                      src={imageUrl}
                      alt={`Photo ${imageId}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    
                    {/* Confidence Badge */}
                    {showResults && confidence !== null && (
                      <div className="absolute top-2 right-2">
                        <div className={`px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm ${
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
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center p-2">
                      <a
                        href={imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-lg text-xs font-medium text-gray-900 hover:bg-white transition-all duration-200 shadow-lg transform translate-y-1 group-hover:translate-y-0"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                        Xem
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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