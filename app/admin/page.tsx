'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface UploadResult {
  file: string;
  success: boolean;
  url?: string;
  faces_detected?: number;
  error?: string;
}

interface ImageItem {
  id: number;
  url: string;
  uploaded_at: string;
  face_count: number;
  event_id?: number;
  processed: number;
}

export default function AdminPage() {
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [progress, setProgress] = useState(0);
  
  // Delete functionality
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Load images
  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/images?limit=200`);
      const data = await response.json();
      if (data.images) {
        setImages(data.images);
      }
    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      setLoading(false);
    }
  };

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
    // Reload images after upload
    setTimeout(loadImages, 1000);
  };

  const toggleImageSelection = (imageId: number) => {
    setSelectedImages(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const selectAllImages = () => {
    if (selectedImages.length === images.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(images.map(img => img.id));
    }
  };

  const deleteSelectedImages = async () => {
    if (selectedImages.length === 0 || deleting) return;

    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn xóa ${selectedImages.length} ảnh? Hành động này không thể hoàn tác.`
    );

    if (!confirmDelete) return;

    setDeleting(true);

    try {
      const deletePromises = selectedImages.map(imageId =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/image/${imageId}`, {
          method: 'DELETE'
        })
      );

      await Promise.all(deletePromises);
      
      // Remove deleted images from local state
      setImages(prev => prev.filter(img => !selectedImages.includes(img.id)));
      setSelectedImages([]);
      
      alert(`Đã xóa thành công ${selectedImages.length} ảnh`);
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Có lỗi xảy ra khi xóa ảnh');
    } finally {
      setDeleting(false);
    }
  };

  const totalFaces = results.reduce((sum, r) => sum + (r.faces_detected || 0), 0);
  const successCount = results.filter(r => r.success).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Admin - Quản lý ảnh</h1>
            <Link 
              href="/" 
              className="text-blue-600 hover:text-blue-800"
            >
              ← Về trang chính
            </Link>
          </div>

          {/* Upload Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Upload ảnh mới</h2>
            
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

            <button
              onClick={uploadFiles}
              disabled={!selectedFiles || uploading}
              className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg font-semibold
                disabled:bg-gray-400 disabled:cursor-not-allowed
                hover:bg-blue-700 transition-colors"
            >
              {uploading ? `Đang upload... ${Math.round(progress)}%` : 'Upload Tất Cả'}
            </button>

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

            {/* Upload Results */}
            {results.length > 0 && (
              <div className="mt-6">
                <h3 className="text-md font-medium mb-3">
                  Kết quả: {successCount}/{results.length} ảnh thành công, 
                  tổng {totalFaces} khuôn mặt được phát hiện
                </h3>
                
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {results.map((result, index) => (
                    <div 
                      key={index} 
                      className={`p-2 rounded text-sm flex items-center justify-between
                        ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
                    >
                      <div>
                        <span className="font-medium">{result.file}</span>
                        {result.success ? (
                          <span className="text-green-600 ml-2">
                            ✓ {result.faces_detected} faces
                          </span>
                        ) : (
                          <span className="text-red-600 ml-2">
                            ✗ {result.error}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Delete Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">
              Quản lý ảnh ({images.length} ảnh)
            </h2>
            
            <div className="flex gap-2">
              <button
                onClick={selectAllImages}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                {selectedImages.length === images.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
              
              {selectedImages.length > 0 && (
                <button
                  onClick={deleteSelectedImages}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                >
                  {deleting ? 'Đang xóa...' : `Xóa ${selectedImages.length} ảnh`}
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              <p className="mt-2 text-gray-600">Đang tải danh sách ảnh...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {images.map((image) => (
                <div key={image.id} className="relative">
                  <div 
                    className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all
                      ${selectedImages.includes(image.id) 
                        ? 'border-red-500 ring-2 ring-red-200' 
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                    onClick={() => toggleImageSelection(image.id)}
                  >
                    <img
                      src={image.url}
                      alt={`Image ${image.id}`}
                      className="w-full aspect-square object-cover"
                    />
                    
                    {/* Selection indicator */}
                    {selectedImages.includes(image.id) && (
                      <div className="absolute inset-0 bg-red-500 bg-opacity-20 flex items-center justify-center">
                        <div className="bg-red-500 text-white rounded-full p-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                    
                    {/* Image info */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                      <div>ID: {image.id}</div>
                      <div>{image.face_count} faces</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {images.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              Không có ảnh nào
            </div>
          )}
        </div>
      </div>
    </div>
  );
}