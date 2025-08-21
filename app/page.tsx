'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
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

type SearchMode = 'strict' | 'balanced' | 'loose';

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
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadGalleryImages();
  }, []);

  const loadGalleryImages = async () => {
    setLoadingGallery(true);
    try {
      const response = await api.getAllImages(0, 1000); // Load all images
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-400/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-teal-400/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Header */}
      <div className="relative backdrop-blur-sm bg-white/80 border-b border-white/20 shadow-lg shadow-black/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
              Kho Ảnh Sự Kiện
            </h1>
            <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              {showResults 
                ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded-full text-sm font-medium">
                        {results.length}
                      </span>
                      ảnh khớp với khuôn mặt của bạn
                    </span>
                  )
                : (
                    <span className="inline-flex items-center gap-2">
                      Khám phá
                      <span className="inline-flex items-center justify-center px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-medium">
                        {total.toLocaleString()}
                      </span>
                      khoảnh khắc đáng nhớ
                    </span>
                  )
              }
            </p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="backdrop-blur-sm bg-white/70 rounded-3xl shadow-xl shadow-black/5 border border-white/20 p-6 lg:p-8 mb-12">
            
            {/* Upload Section */}
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Tìm ảnh của bạn</h2>
                <p className="text-gray-600">Upload ảnh chân dung để tìm kiếm những khoảnh khắc có bạn</p>
              </div>

              <div className="grid lg:grid-cols-2 gap-8 items-start">
                {/* Upload Area */}
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      id="file-upload"
                    />
                    <label 
                      htmlFor="file-upload"
                      className={`relative flex flex-col items-center justify-center w-full h-48 
                        border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300
                        ${selectedFile 
                          ? 'border-blue-400 bg-blue-50/50' 
                          : 'border-gray-300 hover:border-blue-400 bg-gray-50/50 hover:bg-blue-50/30'
                        }`}
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-12 h-12 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="mb-2 text-sm text-gray-600 font-medium">
                          {selectedFile ? selectedFile.name : 'Nhấp để tải ảnh lên'}
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, JPEG (MAX. 10MB)</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Preview */}
                {previewUrl && (
                  <div className="relative">
                    <div className="relative overflow-hidden rounded-2xl shadow-lg">
                      <Image
                        src={previewUrl}
                        alt="Preview"
                        width={400}
                        height={300}
                        className="w-full h-72 object-cover"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <button
                        onClick={clearSearch}
                        className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all duration-200"
                        aria-label="Clear search"
                      >
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-3 text-center">
                      <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        ✓ Ảnh đã sẵn sàng
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Search Controls */}
              {selectedFile && (
                <div className="space-y-6 pt-6 border-t border-gray-200">
                  {/* Mode Selection */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 text-center">Chọn độ chính xác tìm kiếm</h3>
                    <div className="grid sm:grid-cols-3 gap-3">
                      {(['strict', 'balanced', 'loose'] as SearchMode[]).map((modeType) => (
                        <label key={modeType} className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          mode === modeType 
                            ? 'border-blue-500 bg-blue-50 shadow-md' 
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                        }`}>
                          <input
                            type="radio"
                            name="mode"
                            value={modeType}
                            checked={mode === modeType}
                            onChange={handleModeChange}
                            className="sr-only"
                          />
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">
                              {modeType === 'strict' && 'Chính xác cao'}
                              {modeType === 'balanced' && 'Cân bằng'}
                              {modeType === 'loose' && 'Tìm nhiều'}
                            </span>
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              mode === modeType 
                                ? 'border-blue-500 bg-blue-500' 
                                : 'border-gray-300'
                            }`}>
                              {mode === modeType && (
                                <div className="w-full h-full rounded-full bg-white scale-50"></div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            {getModeDescription(modeType)}
                          </p>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  {/* Search Button */}
                  <div className="text-center">
                    <button
                      onClick={handleSearch}
                      disabled={searching}
                      className={`relative inline-flex items-center justify-center px-8 py-4 rounded-2xl font-semibold text-white text-lg
                        transition-all duration-300 shadow-lg min-w-[200px]
                        ${searching 
                          ? 'bg-gray-400 cursor-not-allowed transform scale-95' 
                          : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl hover:scale-105 active:scale-95'
                        }`}
                    >
                      {searching && (
                        <div className="absolute left-6">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      <span className={searching ? 'ml-6' : ''}>
                        {searching ? 'Đang tìm kiếm...' : 'Bắt đầu tìm kiếm'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="relative p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Image Grid */}
        {loadingGallery ? (
          <div className="text-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
            </div>
            <p className="text-lg text-gray-600 font-medium">Đang tải ảnh...</p>
            <p className="text-sm text-gray-500 mt-1">Vui lòng đợi trong giây lát</p>
          </div>
        ) : (
          <div className="space-y-6">
            {showResults && results.length > 0 && (
              <div className="text-center">
                <button
                  onClick={clearSearch}
                  className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  Quay lại xem tất cả ảnh
                </button>
              </div>
            )}
            
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
                      animationDelay: `${index * 0.05}s`,
                      animation: 'fadeInUp 0.6s ease-out forwards',
                      opacity: 0,
                      transform: 'translateY(20px)'
                    }}
                  >
                    <div className="aspect-square overflow-hidden rounded-xl bg-gray-100 shadow-sm group-hover:shadow-xl transition-all duration-300">
                      <Image
                        src={imageUrl}
                        alt={`Photo ${imageId}`}
                        width={300}
                        height={300}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        unoptimized
                      />
                      
                      {/* Confidence Badge */}
                      {showResults && confidence !== null && (
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
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center p-3">
                        <a
                          href={imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-white/95 backdrop-blur-sm rounded-lg text-sm font-medium text-gray-900 hover:bg-white transition-all duration-200 shadow-lg transform translate-y-2 group-hover:translate-y-0"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                          Xem chi tiết
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
    </main>
  );
}