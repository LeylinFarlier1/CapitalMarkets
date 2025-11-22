"use client";

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import OptionChain from '../components/OptionChain';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExp, setSelectedExp] = useState('');

  useEffect(() => {
    fetchChain();
  }, []);

  const fetchChain = async (exp?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ underlying: 'NVDA' });
      if (exp) params.append('expiration', exp);
      const res = await fetch(`/api/chain?${params}`);
      if (res.ok) {
        const newData = await res.json();
        setData(newData);
        if (!exp && newData.expirations && newData.expirations.length > 0) {
          setSelectedExp(newData.expirations[0]);
        }
      } else {
        console.error('Error fetching chain:', res.status);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExpChange = (exp: string) => {
    setSelectedExp(exp);
    fetchChain(exp);
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

  // Filtra opciones por expiración seleccionada
  const filteredData = selectedExp
    ? {
        ...data,
        options: data.options.filter((o: any) => o.expiration === selectedExp),
        expirations: [selectedExp],
      }
    : data;

  return (
    <div className="p-6">
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Selecciona vencimiento:
        </label>
        <select
          value={selectedExp}
          onChange={(e) => handleExpChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {data.expirations && data.expirations.length > 0 ? (
            data.expirations.map((exp: string) => (
              <option key={exp} value={exp}>
                {exp}
              </option>
            ))
          ) : (
            <option>No expirations available</option>
          )}
        </select>
      </div>
      <OptionChain data={filteredData} />
    </div>
  );
}