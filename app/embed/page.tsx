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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-3 sm:p-4 lg:p-6">
      {/* Animated background elements with brand colors */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full blur-3xl animate-pulse" style={{background: 'linear-gradient(135deg, #EC2789, #522E90)'}}></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full blur-3xl animate-pulse" style={{background: 'linear-gradient(135deg, #522E90, #EC2789)', animationDelay: '2s'}}></div>
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full blur-3xl animate-pulse" style={{background: 'linear-gradient(135deg, #EC2789, #522E90)', animationDelay: '4s'}}></div>
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* Search Section */}
        <div className="backdrop-blur-xl bg-gray-800/50 border border-gray-700/50 rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 mb-6 lg:mb-8" style={{backgroundColor: 'rgba(255, 250, 250, 0.05)'}}>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl shadow-xl" style={{background: 'linear-gradient(135deg, #EC2789, #522E90)'}}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-white">
                Tìm Ảnh Của Bạn
              </h2>
              <p className="text-sm text-gray-300 mt-1">Nhận diện khuôn mặt thông minh - Tìm kiếm nhanh chóng</p>
            </div>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            {/* Upload Area - Enhanced UX */}
            <div className="space-y-4">
              <div className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  id="file-upload-embed"
                />
                <label 
                  htmlFor="file-upload-embed"
                  className={`relative flex flex-col items-center justify-center w-full h-40 sm:h-44
                    border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 group-hover:scale-[1.02]
                    ${selectedFile 
                      ? 'border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/20' 
                      : 'border-gray-600 hover:border-pink-500 bg-gray-800/30 hover:bg-pink-500/5'
                    }`}
                  style={{
                    borderColor: selectedFile ? '#EC2789' : undefined,
                    backgroundColor: selectedFile ? 'rgba(236, 39, 137, 0.1)' : undefined
                  }}
                >
                  <div className="flex flex-col items-center justify-center p-4">
                    <div className={`p-3 rounded-full mb-3 transition-all duration-300 ${selectedFile ? 'bg-pink-500/20' : 'bg-gray-700/50 group-hover:bg-pink-500/10'}`}>
                      <svg className={`w-8 h-8 transition-colors duration-300 ${selectedFile ? 'text-pink-400' : 'text-gray-400 group-hover:text-pink-400'}`} fill="none" stroke="currentColor" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-center text-white mb-1">
                      {selectedFile ? selectedFile.name : 'Kéo thả hoặc nhấp để chọn ảnh'}
                    </p>
                    <p className="text-xs text-gray-400">PNG, JPG, JPEG (Tối đa 10MB)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Enhanced Preview */}
            {previewUrl && (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-xl shadow-2xl group">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-40 sm:h-44 object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20"></div>
                  <button
                    onClick={clearSearch}
                    className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-all duration-200 group-hover:scale-110"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  {/* AI Recognition Indicator */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-white font-medium">AI sẵn sàng nhận diện</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Search Controls */}
          {selectedFile && (
            <div className="space-y-6 pt-6 border-t border-gray-700/50 mt-6">
              {/* Mode Selection - Premium UX */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                  Độ chính xác tìm kiếm
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'strict', label: 'Chính xác cao', desc: 'Kết quả ít, độ tin cậy cao', icon: '🎯' },
                    { value: 'balanced', label: 'Cân bằng', desc: 'Tối ưu giữa chất lượng và số lượng', icon: '⚖️' },
                    { value: 'loose', label: 'Tìm rộng', desc: 'Nhiều kết quả, bao quát hơn', icon: '🔍' }
                  ].map((modeOption) => (
                    <label key={modeOption.value} className={`relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all duration-300 group hover:scale-[1.02] ${
                      mode === modeOption.value 
                        ? 'border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/20' 
                        : 'border-gray-600 bg-gray-800/30 hover:border-pink-500/50 hover:bg-pink-500/5'
                    }`}>
                      <input
                        type="radio"
                        name="mode"
                        value={modeOption.value}
                        checked={mode === modeOption.value}
                        onChange={(e) => setMode(e.target.value as 'strict' | 'balanced' | 'loose')}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{modeOption.icon}</span>
                          <span className="text-sm font-medium text-white">{modeOption.label}</span>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                          mode === modeOption.value 
                            ? 'border-pink-500 bg-pink-500 shadow-lg shadow-pink-500/30' 
                            : 'border-gray-500 group-hover:border-pink-400'
                        }`}>
                          {mode === modeOption.value && (
                            <div className="w-full h-full rounded-full bg-white scale-[0.4] transition-transform duration-200"></div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{modeOption.desc}</p>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Premium Search Button */}
              <div className="text-center pt-2">
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className={`relative inline-flex items-center justify-center px-8 py-4 rounded-2xl font-bold text-white text-lg
                    transition-all duration-300 shadow-2xl min-w-[180px] group overflow-hidden
                    ${searching 
                      ? 'cursor-not-allowed scale-95 opacity-70' 
                      : 'hover:scale-105 active:scale-95 hover:shadow-pink-500/25'
                    }`}
                  style={{
                    background: searching 
                      ? 'linear-gradient(135deg, #6B7280, #4B5563)' 
                      : 'linear-gradient(135deg, #EC2789, #522E90)'
                  }}
                >
                  {/* Animated background */}
                  {!searching && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  )}
                  
                  {searching && (
                    <div className="absolute left-6">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    </div>
                  )}
                  <span className={`relative z-10 flex items-center gap-2 ${searching ? 'ml-6' : ''}`}>
                    {!searching && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    {searching ? 'Đang phân tích...' : 'Bắt đầu tìm kiếm'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Enhanced Error Message */}
          {error && (
            <div className="relative p-4 bg-red-500/10 border border-red-500/30 rounded-xl mt-6 backdrop-blur-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Results Header */}
        <div className="flex items-center justify-between mb-6 lg:mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl shadow-lg" style={{background: 'linear-gradient(135deg, #522E90, #EC2789)'}}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl lg:text-2xl font-bold text-white">
                {showResults ? 'Kết quả tìm kiếm' : 'Thư viện ảnh sự kiện'}
              </h3>
              <p className="text-sm text-gray-300 flex items-center gap-2 mt-1">
                {showResults ? (
                  <>
                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white rounded-full shadow-lg" style={{background: 'linear-gradient(135deg, #EC2789, #522E90)'}}>
                      {results.length}
                    </span>
                    ảnh phù hợp với khuôn mặt của bạn
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white rounded-full shadow-lg" style={{background: 'linear-gradient(135deg, #522E90, #EC2789)'}}>
                      {total}
                    </span>
                    khoảnh khắc đáng nhớ
                  </>
                )}
              </p>
            </div>
          </div>

          {showResults && results.length > 0 && (
            <button
              onClick={clearSearch}
              className="inline-flex items-center px-4 py-2.5 bg-gray-800/50 border border-gray-600 rounded-xl font-medium text-gray-200 hover:bg-gray-700/50 hover:border-pink-500/50 transition-all duration-200 shadow-lg backdrop-blur-sm group"
            >
              <svg className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              Xem tất cả
            </button>
          )}
        </div>

        {/* Premium Image Grid */}
        {loadingGallery ? (
          <div className="text-center py-16 lg:py-20">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-gray-600 border-t-pink-500 rounded-full animate-spin mx-auto shadow-lg"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-4 border-gray-700 border-t-purple-500 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
            </div>
            <h4 className="text-xl font-bold text-white mb-2">Đang tải kho ảnh...</h4>
            <p className="text-gray-400">AI đang chuẩn bị những khoảnh khắc tuyệt vời cho bạn</p>
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
                    animationDelay: `${index * 0.02}s`,
                    animation: 'fadeInUp 0.6s ease-out forwards',
                    opacity: 0,
                    transform: 'translateY(20px)'
                  }}
                >
                  <div className="aspect-square overflow-hidden rounded-xl bg-gray-800 shadow-lg group-hover:shadow-2xl transition-all duration-500 border border-gray-700/50 group-hover:border-pink-500/30">
                    <img
                      src={imageUrl}
                      alt={`Photo ${imageId}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    
                    {/* Enhanced Confidence Badge */}
                    {showResults && confidence !== null && (
                      <div className="absolute top-2 right-2">
                        <div className={`px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-sm border shadow-lg ${
                          confidence >= 0.8 
                            ? 'bg-green-500/90 text-white border-green-400/50 shadow-green-500/25' 
                            : confidence >= 0.6
                            ? 'bg-yellow-500/90 text-white border-yellow-400/50 shadow-yellow-500/25'
                            : 'bg-orange-500/90 text-white border-orange-400/50 shadow-orange-500/25'
                        }`}>
                          {Math.round(confidence * 100)}%
                        </div>
                      </div>
                    )}
                    
                    {/* Premium Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end justify-center p-3">
                      <a
                        href={imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-xl backdrop-blur-sm border border-white/20 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:scale-105"
                        style={{background: 'linear-gradient(135deg, #EC2789, #522E90)'}}
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