const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = {
  health: async () => {
    const res = await fetch(`${API_URL}/health`);
    return res.json();
  },
  
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },
  
  searchFaces: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`${API_URL}/api/search`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },
  
  getAllImages: async (skip = 0, limit = 100) => {
    const res = await fetch(`${API_URL}/api/images?skip=${skip}&limit=${limit}`);
    return res.json();
  }
};