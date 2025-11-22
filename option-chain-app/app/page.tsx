"use client";

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import OptionChain from '../components/OptionChain';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChain();
  }, []);

  const fetchChain = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ underlying: 'NVDA' });
      const res = await fetch(`/api/chain?${params}`);
      if (res.ok) {
        const newData = await res.json();
        setData(newData);
      } else {
        console.error('Error fetching chain:', res.status);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-4 text-red-500">Error cargando datos. Recarga la página.</div>;
  }

  return (
    <div className="p-6">
      <OptionChain data={data} />
    </div>
  );
}