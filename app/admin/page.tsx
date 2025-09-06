'use client';
import { useState } from 'react';
import Link from 'next/link';

interface UploadResult {
  file: string;
  success: boolean;
  url?: string;
  faces_detected?: number;
  error?: string;
}

export default function AdminPage() {
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
    setResults([]);
  };

  const uploadFiles = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    setProgress(0);
    const uploadResults: UploadResult[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        
        uploadResults.push({
          file: file.name,
          success: data.success,
          url: data.url,
          faces_detected: data.faces_detected,
          error: data.error
        });
      } catch {
        uploadResults.push({
          file: file.name,
          success: false,
          error: 'Upload failed'
        });
      }

      setProgress(((i + 1) / selectedFiles.length) * 100);
      setResults([...uploadResults]);
    }

    setUploading(false);
  };

  const clearAllData = async () => {
    if (!confirm('⚠️ BẠN CHẮC CHẮN MUỐN XÓA TẤT CẢ DỮ LIỆU?\nHành động này không thể hoàn tác!')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clear-all`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (data.success) {
        alert('✅ Đã xóa tất cả dữ liệu thành công');
        setResults([]);
        setSelectedFiles(null);
      } else {
        alert('❌ Lỗi: ' + data.message);
      }
    } catch (error) {
      alert('❌ Lỗi khi xóa dữ liệu');
    }
    setDeleting(false);
  };

  const totalFaces = results.reduce((sum, r) => sum + (r.faces_detected || 0), 0);
  const successCount = results.filter(r => r.success).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Admin - Upload Ảnh</h1>
            <Link 
              href="/" 
              className="text-blue-600 hover:text-blue-800"
            >
              ← Về trang chính
            </Link>
          </div>

          {/* Upload Section */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn nhiều ảnh để upload
            </label>
            <input 
              type="file" 
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                disabled:opacity-50"
            />
            
            {selectedFiles && (
              <p className="mt-2 text-sm text-gray-600">
                Đã chọn {selectedFiles.length} ảnh
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="space-y-4">
            <button
              onClick={uploadFiles}
              disabled={!selectedFiles || uploading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold
                disabled:bg-gray-400 disabled:cursor-not-allowed
                hover:bg-blue-700 transition-colors"
            >
              {uploading ? `Đang upload... ${Math.round(progress)}%` : 'Upload Tất Cả'}
            </button>

            <button
              onClick={clearAllData}
              disabled={deleting}
              className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold
                hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Đang xóa...' : '🗑️ Xóa Tất Cả Dữ Liệu Database'}
            </button>
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">
                Kết quả: {successCount}/{results.length} ảnh thành công, 
                tổng {totalFaces} khuôn mặt được phát hiện
              </h2>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg flex items-center justify-between
                      ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{result.file}</p>
                      {result.success ? (
                        <p className="text-xs text-green-600">
                          ✓ Upload thành công - {result.faces_detected} khuôn mặt
                        </p>
                      ) : (
                        <p className="text-xs text-red-600">
                          ✗ Lỗi: {result.error}
                        </p>
                      )}
                    </div>
                    {result.url && (
                      <a 
                        href={result.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Xem ảnh
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}