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
    <div className="bg-white p-4">
      {/* Search Section */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Tìm Ảnh Của Bạn</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          {/* Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload ảnh chân dung
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                cursor-pointer"
            />
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                onClick={clearSearch}
                className="absolute top-2 right-2 bg-white p-1 rounded-full shadow-md hover:bg-gray-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Search Controls */}
        {selectedFile && (
          <div className="mt-4">
            <div className="mb-3 flex justify-center gap-3 text-sm">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="mode"
                  value="strict"
                  checked={mode === 'strict'}
                  onChange={(e) => setMode(e.target.value as 'strict' | 'balanced' | 'loose')}
                  className="mr-1"
                />
                <span>Chính xác cao</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="mode"
                  value="balanced"
                  checked={mode === 'balanced'}
                  onChange={(e) => setMode(e.target.value as 'strict' | 'balanced' | 'loose')}
                  className="mr-1"
                />
                <span>Cân bằng</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="mode"
                  value="loose"
                  checked={mode === 'loose'}
                  onChange={(e) => setMode(e.target.value as 'strict' | 'balanced' | 'loose')}
                  className="mr-1"
                />
                <span>Tìm nhiều</span>
              </label>
            </div>
            
            <div className="text-center">
              <button
                onClick={handleSearch}
                disabled={searching}
                className={`px-6 py-2 rounded-lg font-semibold text-white text-sm
                  ${searching 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                  } transition-colors`}
              >
                {searching ? 'Đang tìm kiếm...' : 'Tìm Ảnh'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Results Header */}
      <h3 className="text-lg font-semibold mb-4">
        {showResults 
          ? `Tìm thấy ${results.length} ảnh khớp với khuôn mặt của bạn`
          : `Tổng cộng ${total} ảnh trong sự kiện`
        }
      </h3>

      {/* Image Grid */}
      {loadingGallery ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600 text-sm">Đang tải ảnh...</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {(showResults ? results : galleryImages).map((image) => {
            const imageId = 'image_id' in image ? image.image_id : image.id;
            const imageUrl = image.url;
            const confidence = 'confidence' in image ? image.confidence : null;
            
            return (
              <div key={imageId} className="relative group">
                <div className="aspect-square overflow-hidden rounded bg-gray-100">
                  <img
                    src={imageUrl}
                    alt={`Photo ${imageId}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {showResults && confidence !== null && (
                    <div className="absolute top-1 right-1 bg-black bg-opacity-70 text-white px-1 py-0.5 rounded text-xs">
                      {Math.round(confidence * 100)}%
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300 flex items-center justify-center">
                  <a
                    href={imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-1 rounded text-xs"
                  >
                    Xem
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}