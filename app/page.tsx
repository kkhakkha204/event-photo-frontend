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

export default function Home() {
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

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Kho Ảnh Sự Kiện</h1>
          <p className="text-gray-600 mt-2">
            {showResults 
              ? `Tìm thấy ${results.length} ảnh khớp với khuôn mặt của bạn`
              : `Tổng cộng ${total} ảnh trong sự kiện`
            }
          </p>
        </div>
      </div>

      {/* Search Section */}
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Upload Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tìm ảnh của bạn - Upload ảnh chân dung
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
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  onClick={clearSearch}
                  className="absolute top-2 right-2 bg-white p-1 rounded-full shadow-md hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Search Controls */}
          {selectedFile && (
            <div className="mt-6">
              {/* Mode Selection */}
              <div className="mb-4 flex justify-center gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="mode"
                    value="strict"
                    checked={mode === 'strict'}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="mr-2"
                  />
                  <span className="text-sm">Chính xác cao</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="mode"
                    value="balanced"
                    checked={mode === 'balanced'}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="mr-2"
                  />
                  <span className="text-sm">Cân bằng</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="mode"
                    value="loose"
                    checked={mode === 'loose'}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="mr-2"
                  />
                  <span className="text-sm">Tìm nhiều</span>
                </label>
              </div>
              
              <div className="text-center">
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className={`px-6 py-3 rounded-lg font-semibold text-white
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

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Image Grid */}
        {loadingGallery ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Đang tải ảnh...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {(showResults ? results : galleryImages).map((image: any) => (
              <div key={image.id || image.image_id} className="relative group">
                <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={image.url}
                    alt={`Photo ${image.id || image.image_id}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {showResults && (
                    <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                      {Math.round(image.confidence * 100)}% khớp
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300 flex items-center justify-center">
                  <a
                    href={image.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-white px-3 py-1 rounded text-sm"
                  >
                    Xem lớn
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}