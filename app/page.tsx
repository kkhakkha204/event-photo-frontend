'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function Home() {
  const [status, setStatus] = useState<string>('Checking...');

  useEffect(() => {
    api.health().then(data => {
      setStatus(data.database === 'connected' ? 'Connected' : 'Disconnected');
    }).catch(() => {
      setStatus('Error');
    });
  }, []);

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-4">Event Photo Search</h1>
      <p>Backend status: {status}</p>
    </main>
  );
}