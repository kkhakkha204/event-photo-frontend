const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = {
  health: async () => {
    const res = await fetch(`${API_URL}/health`);
    return res.json();
  }
};