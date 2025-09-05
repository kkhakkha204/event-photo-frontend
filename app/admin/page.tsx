'use client';
import { useState } from 'react';
import Link from 'next/link';

interface UploadResult {
  file: string;
  success: boolean;
  url?: string;
  faces_detected?: number;
  error?: string;
  original_size?: string;
  compressed_size?: string;
}

export default function AdminPage() {
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
    setResults([]);
  };

  // Function to compress image while maintaining quality for face detection
  const compressImage = (file: File, maxWidth = 1920, maxHeight = 1920): Promise<{
    blob: Blob;
    originalSize: number;
    compressedSize: number;
  }> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      img.onload = () => {
        try {
          // Calculate optimal dimensions
          let { width, height } = img;
          
          // Only resize if image is larger than max dimensions
          if (width > maxWidth || height > maxHeight) {
            const aspectRatio = width / height;
            
            if (width > height) {
              width = maxWidth;
              height = width / aspectRatio;
            } else {
              height = maxHeight;
              width = height * aspectRatio;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Use high-quality scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Draw image with optimal quality
          ctx.drawImage(img, 0, 0, width, height);
          
          // Try different quality levels until file size is acceptable
          const tryCompress = (quality: number) => {
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              
              const maxSize = 8 * 1024 * 1024; // 8MB limit
              
              if (blob.size <= maxSize || quality <= 0.5) {
                resolve({
                  blob,
                  originalSize: file.size,
                  compressedSize: blob.size
                });
              } else {
                // Try with lower quality
                tryCompress(quality - 0.1);
              }
            }, 'image/jpeg', quality);
          };
          
          // Start with high quality (0.85) and reduce if needed
          tryCompress(0.85);
          
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const uploadFiles = async () => {
  if (!selectedFiles || selectedFiles.length === 0) return;

  setUploading(true);
  setProgress(0);
  const uploadResults: UploadResult[] = [];

  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];

    try {
      const formData = new FormData();
      formData.append('file', file); // Gửi file gốc, không nén

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
        error: data.error || (res.ok ? undefined : data.detail),
        original_size: formatFileSize(file.size),
        compressed_size: data.compression_info?.compressed_size_mb ? 
          formatFileSize(data.compression_info.compressed_size_mb * 1024 * 1024) : undefined
      });
      
    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
      uploadResults.push({
        file: file.name,
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed',
        original_size: formatFileSize(file.size)
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
  const totalOriginalSize = results.reduce((sum, r) => 
    sum + (r.original_size ? parseFloat(r.original_size.split(' ')[0]) * (r.original_size.includes('MB') ? 1024 * 1024 : r.original_size.includes('KB') ? 1024 : 1) : 0), 0
  );
  const totalCompressedSize = results.reduce((sum, r) => 
    sum + (r.compressed_size ? parseFloat(r.compressed_size.split(' ')[0]) * (r.compressed_size.includes('MB') ? 1024 * 1024 : r.compressed_size.includes('KB') ? 1024 : 1) : 0), 0
  );

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
              <div className="mt-2 text-sm text-gray-600">
                <p>Đã chọn {selectedFiles.length} ảnh</p>
                <p className="text-xs text-blue-600">
                  * Chỉ nén ảnh 9MB để giữ chất lượng gần như nguyên bản (max 70% compression)
                </p>
              </div>
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
              {uploading ? (
                compressionProgress > 0 ? 
                  `Đang nén ảnh... ${Math.round(compressionProgress)}%` :
                  `Đang upload... ${Math.round(progress)}%`
              ) : 'Upload Tất Cả'}
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
            <div className="mt-4 space-y-2">
              {compressionProgress > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Đang nén ảnh</span>
                    <span>{Math.round(compressionProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-orange-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${compressionProgress}%` }}
                    />
                  </div>
                </div>
              )}
              
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Upload progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="mt-8">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">
                  Kết quả: {successCount}/{results.length} ảnh thành công, 
                  tổng {totalFaces} khuôn mặt được phát hiện
                </h2>
                {totalCompressedSize > 0 && (
                  <p className="text-sm text-green-600">
                    Tiết kiệm: {formatFileSize(totalOriginalSize - totalCompressedSize)} 
                    ({Math.round((1 - totalCompressedSize / totalOriginalSize) * 100)}% reduction)
                  </p>
                )}
              </div>
              
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
                        <div className="text-xs text-green-600">
                          <p>✓ Upload thành công - {result.faces_detected} khuôn mặt</p>
                          {result.compressed_size && (
                            <p>📦 Nén: {result.original_size} → {result.compressed_size}</p>
                          )}
                        </div>
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
                        className="text-blue-600 hover:text-blue-800 text-sm ml-4"
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