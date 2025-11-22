"use client"; // ← Importante para Next.js

import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowUpDown, Loader2, HelpCircle } from "lucide-react";

interface Option {
  symbol: string;
  type: "call" | "put";
  strike: string;
  expiration: string;
  bid: string | null;
  ask: string | null;
  mark: string | null;
  last: string | null;
  volume: number | null;
  open_interest: number | null;
  implied_volatility: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
}

interface OptionChainData {
  underlying: string;
  spot: number;
  as_of: string;
  expirations: string[];
  options: Option[];
}

const greekTooltips: Record<string, string> = {
  delta: "Cambio del precio de la opción por cada $1 que sube el subyacente",
  gamma: "Cambio del delta por cada $1 que sube el subyacente",
  vega: "Cambio del precio por cada 1% de aumento en volatilidad implícita",
  theta: "Pérdida diaria aproximada por paso del tiempo (decay)",
};

interface OptionChainProps {
  data: OptionChainData;
}

export default function OptionChain({ data }: OptionChainProps) {
  const [selectedExp, setSelectedExp] = useState(data.expirations[0] ?? "");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  useEffect(() => {
    setSelectedExp(data.expirations[0] ?? "");
  }, [data.expirations]);

  const filteredOptions = useMemo(() => {
    return data.options.filter((o) => o.expiration === selectedExp);
  }, [data.options, selectedExp]);

  const strikes = useMemo(() => {
    const set = new Set(filteredOptions.map((o) => o.strike));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [filteredOptions]);

  const callsPutsByStrike = useMemo(() => {
    const map = new Map<string, { call?: Option; put?: Option }>();
    filteredOptions.forEach((opt) => {
      const current = map.get(opt.strike) || {};
      if (opt.type === "call") current.call = opt;
      else current.put = opt;
      map.set(opt.strike, current);
    });
    return map;
  }, [filteredOptions]);

  const getSortableValue = (option: Option | undefined, key: string) => {
    const rawValue = option?.[key as keyof Option];
    if (rawValue === null || rawValue === undefined) return null;

    if (typeof rawValue === "string") {
      const parsed = Number(rawValue);
      return Number.isFinite(parsed) ? parsed : rawValue;
    }

    return rawValue;
  };

  const sortedStrikes = useMemo(() => {
    if (!sortConfig) return strikes;

    const sortableItems = [...strikes].map((strike) => {
      const pair = callsPutsByStrike.get(strike)!;
      const call = pair.call;
      const put = pair.put;
      const value =
        sortConfig.key === "strike"
          ? Number(strike)
          : getSortableValue(call, sortConfig.key) ?? getSortableValue(put, sortConfig.key) ?? 0;

      return { strike, value };
    });

    sortableItems.sort((a, b) => {
      if (a.value < b.value) return sortConfig.direction === "asc" ? -1 : 1;
      if (a.value > b.value) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return sortableItems.map((item) => item.strike);
  }, [strikes, callsPutsByStrike, sortConfig]);

  const atmStrike = Math.round(data.spot / 5) * 5;

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "desc";
    if (sortConfig?.key === key && sortConfig.direction === "desc") direction = "asc";
    setSortConfig({ key, direction });
  };

  const formatNum = (n: number | null | undefined, decimals = 4) =>
    n === null || n === undefined ? "—" : n.toFixed(decimals);
  const formatPrice = (n: string | null | undefined) =>
    n === null || n === undefined ? "—" : Number(n).toFixed(2);
  const formatIV = (n: number | null | undefined) =>
    n === null || n === undefined ? "—" : (n * 100).toFixed(2) + "%";
  const formatDelta = (n: number | null | undefined) =>
    n === null || n === undefined ? "—" : n.toFixed(3);

  if (!data || data.options.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Cargando datos...</span>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{data.underlying}</h1>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-4xl font-bold text-gray-800">${data.spot.toFixed(2)}</span>
              <span className="text-lg text-green-600">+2.45 (+1.75%)</span>
            </div>
          </div>

          <select
            value={selectedExp}
            onChange={(e) => setSelectedExp(e.target.value)}
            className="px-4 py-3 rounded-lg border border-gray-300 text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {data.expirations.map((exp) => (
              <option key={exp} value={exp}>
                {format(new Date(exp), "dd MMM yyyy")} ({Math.round((new Date(exp).getTime() - new Date().getTime()) / (86400 * 1000))} días)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white">
              <tr>
                {/* Calls */}
                {["bid", "mark", "ask", "last", "volume", "open_interest", "implied_volatility", "delta", "gamma", "vega", "theta"].map((key) => (
                  <th
                    key={`call-${key}`}
                    onClick={() => handleSort(key)}
                    className="px-3 py-4 text-left font-semibold cursor-pointer hover:bg-gray-800 transition relative group"
                  >
                    <div className="flex items-center gap-1">
                      {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      <ArrowUpDown className="w-4 h-4 opacity-60" />
                      {greekTooltips[key] && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">
                          {greekTooltips[key]}
                          <HelpCircle className="w-3 h-3 inline ml-1" />
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-6 py-4 text-center font-bold text-lg">Strike</th>
                {/* Puts */}
                {["theta", "vega", "gamma", "delta", "implied_volatility", "open_interest", "volume", "last", "ask", "mark", "bid"].map((key) => (
                  <th
                    key={`put-${key}`}
                    onClick={() => handleSort(key)}
                    className="px-3 py-4 text-right font-semibold cursor-pointer hover:bg-gray-800 transition"
                  >
                    {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    <ArrowUpDown className="w-4 h-4 opacity-60 ml-1 inline" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedStrikes.map((strike) => {
                const pair = callsPutsByStrike.get(strike)!;
                const call = pair.call;
                const put = pair.put;
                const isATM = Number(strike) === atmStrike;
                const isITMCall = data.spot > Number(strike);
                const isITMPut = data.spot < Number(strike);

                return (
                  <tr
                    key={strike}
                    className={`hover:bg-gray-50 transition ${isATM ? "bg-yellow-50" : ""}`}
                  >
                    {/* CALLS */}
                    <td className={`px-3 py-3 ${isITMCall ? "bg-green-50 font-semibold" : ""}`}>{formatPrice(call?.bid)}</td>
                    <td className="px-3 py-3 font-bold text-green-700">{formatPrice(call?.mark)}</td>
                    <td className={`px-3 py-3 ${isITMCall ? "bg-green-50 font-semibold" : ""}`}>{formatPrice(call?.ask)}</td>
                    <td className="px-3 py-3">{formatPrice(call?.last)}</td>
                    <td className="px-3 py-3 text-right">{call?.volume?.toLocaleString() ?? "-"}</td>
                    <td className="px-3 py-3 text-right">{call?.open_interest?.toLocaleString() ?? "-"}</td>
                    <td className={`px-3 py-3 font-medium ${call?.implied_volatility && call.implied_volatility > 0.8 ? "text-red-600" : ""}`}>
                      {formatIV(call?.implied_volatility)}
                    </td>
                    <td className="px-3 py-3 text-green-600 font-medium">{formatDelta(call?.delta)}</td>
                    <td className="px-3 py-3">{formatNum(call?.gamma, 4)}</td>
                    <td className="px-3 py-3">{formatNum(call?.vega, 4)}</td>
                    <td className="px-3 py-3 text-red-600">{formatNum(call?.theta, 4)}</td>

                    {/* STRIKE */}
                    <td className="px-6 py-3 text-center font-bold text-lg bg-gray-100">
                      {Number(strike).toFixed(1)}
                    </td>

                    {/* PUTS */}
                    <td className={`px-3 py-3 text-red-600 ${isITMPut ? "bg-red-50 font-semibold" : ""}`}>{formatNum(put?.theta, 4)}</td>
                    <td className="px-3 py-3">{formatNum(put?.vega, 4)}</td>
                    <td className="px-3 py-3">{formatNum(put?.gamma, 4)}</td>
                    <td className="px-3 py-3 text-red-600 font-medium">{formatDelta(put?.delta)}</td>
                    <td className={`px-3 py-3 font-medium ${put?.implied_volatility && put.implied_volatility > 0.8 ? "text-red-600" : ""}`}>
                      {formatIV(put?.implied_volatility)}
                    </td>
                    <td className="px-3 py-3 text-right">{put?.open_interest?.toLocaleString() ?? "-"}</td>
                    <td className="px-3 py-3 text-right">{put?.volume?.toLocaleString() ?? "-"}</td>
                    <td className="px-3 py-3">{formatPrice(put?.last)}</td>
                    <td className={`px-3 py-3 ${isITMPut ? "bg-red-50 font-semibold" : ""}`}>{formatPrice(put?.ask)}</td>
                    <td className="px-3 py-3 font-bold text-red-700">{formatPrice(put?.mark)}</td>
                    <td className={`px-3 py-3 ${isITMPut ? "bg-red-50 font-semibold" : ""}`}>{formatPrice(put?.bid)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 text-center text-sm text-gray-500">
        Datos al {format(new Date(data.as_of), "dd/MM/yyyy HH:mm")} • {data.options.length} contratos
      </div>
    </div>
  );
}