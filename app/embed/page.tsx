'use client';

import { useState, useEffect } from 'react';
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

  const clearSearch = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setResults([]);
    setShowResults(false);
    setError('');
  };

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
                    border-2 border-dashed rounded-xl cursor-pointer
                    ${selectedFile 
                      ? 'border-[#EC2789] bg-[#EC2789]/5' 
                      : 'border-gray-200 bg-gray-50'
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
                      className="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 bg-white/90 rounded-full shadow-lg flex items-center justify-center"
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
                className={`inline-flex items-center justify-center px-6 py-3 sm:px-8 sm:py-4 rounded-xl text-sm sm:text-base font-semibold text-white min-w-[160px] sm:min-w-[180px] shadow-lg
                  ${searching 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-[#EC2789] to-[#522E90]'
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
                </p>
              </div>
            </div>

            {showResults && results.length > 0 && (
              <button
                onClick={clearSearch}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm font-medium text-gray-700"
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {(showResults ? results : galleryImages).map((image, index) => {
                const imageId = 'image_id' in image ? image.image_id : image.id;
                const imageUrl = image.url;
                
                return (
                  <div 
                    key={imageId} 
                    className="relative cursor-pointer"
                    onClick={() => openImage(imageUrl, index)}
                  >
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                      <img
                        src={imageUrl}
                        alt={`Photo ${imageId}`}
                        className="w-full h-full object-cover"
                      />
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
          <button
            onClick={closeImage}
            className="absolute top-4 right-4 z-10 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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