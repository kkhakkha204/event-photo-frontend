'use client';
import { useState } from 'react';

export default function AdminPage() {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      console.log('Upload result:', data);
      alert(data.success ? 'Upload thành công!' : 'Upload thất bại!');
    } catch (error) {
      console.error('Upload error:', error);
    }
    setUploading(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Upload</h1>
      <input 
        type="file" 
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
      />
      {uploading && <p>Đang upload...</p>}
    </div>
  );
}