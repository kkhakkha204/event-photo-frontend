'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

interface SearchResult {
  image_id: number;
  url: string;
  matches: number;
  confidence: number;
  faces: Array<{
    distance: number;
    confidence: number;
    bbox: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
  }>;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string>('');
  const [mode, setMode] = useState<'strict' | 'balanced' | 'loose'>('balanced');
  const [thresholds, setThresholds] = useState<any>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
      setResults([]);
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
        setThresholds(response.thresholds);
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

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Tìm Ảnh Của Bạn</h1>
          <p className="text-gray-600 mt-2">Upload ảnh chân dung để tìm tất cả ảnh có mặt bạn trong sự kiện</p>
        </div>
      </div>

      {/* Search Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Upload Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn ảnh chân dung của bạn
              </label>
              <div className="relative">
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
            </div>

            {/* Preview */}
            <div>
              {previewUrl && (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Search Button */}
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
                disabled={!selectedFile || searching}
                className={`px-6 py-3 rounded-lg font-semibold text-white
                  ${!selectedFile || searching 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                  } transition-colors`}
              >
                {searching ? 'Đang tìm kiếm...' : 'Tìm Ảnh'}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Results Grid */}
        {results.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">
                Tìm thấy {results.length} ảnh có khuôn mặt của bạn
              </h2>
              <div className="text-sm text-gray-600">
                Hiển thị ảnh có độ chính xác từ cao đến thấp
              </div>
            </div>
            
            {/* Filter by confidence */}
            <div className="mb-6 flex gap-4">
              <button
                onClick={() => setResults(results.filter(r => r.confidence > 0.8))}
                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
              >
                Chỉ hiện &gt;80% khớp
              </button>
              <button
                onClick={() => setResults(results.filter(r => r.confidence > 0.6))}
                className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
              >
                Chỉ hiện &gt;60% khớp
              </button>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Hiện tất cả
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((result) => (
                <div key={result.image_id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <img
                    src={result.url}
                    alt={`Result ${result.image_id}`}
                    className="w-full h-64 object-cover"
                  />
                  <div className="p-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600">
                        {result.matches} khuôn mặt
                      </p>
                      <span className={`text-sm font-semibold ${
                        result.confidence > 0.8 ? 'text-green-600' : 
                        result.confidence > 0.6 ? 'text-yellow-600' : 
                        'text-red-600'
                      }`}>
                        {Math.round(result.confidence * 100)}% khớp
                      </span>
                    </div>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-blue-600 hover:text-blue-800"
                    >
                      Xem ảnh gốc →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}