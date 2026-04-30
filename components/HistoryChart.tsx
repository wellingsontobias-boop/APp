import React, { useState, useEffect } from 'react';
import { HistoryEntry } from '../types';

interface HistoryChartProps {
  data: HistoryEntry[];
  customTooltip?: React.ReactElement;
}

const HistoryChart: React.FC<HistoryChartProps> = ({ data, customTooltip }) => {
  // Use state to hold the library once it's loaded from the CDN.
  const [Recharts, setRecharts] = useState<any | null>((window as any).Recharts || null);

  useEffect(() => {
    // If the library is already loaded, do nothing.
    if (Recharts) {
      return;
    }

    // Set an interval to check for the library on the window object.
    const interval = setInterval(() => {
      if ((window as any).Recharts) {
        setRecharts((window as any).Recharts);
        clearInterval(interval);
      }
    }, 100); // Check every 100ms

    // Cleanup the interval if the component unmounts before the library loads.
    return () => clearInterval(interval);
  }, [Recharts]); // This effect runs once on mount and if Recharts state changes.

  if (!Recharts) {
    return (
        <div className="w-full h-96 bg-slate-800 p-4 rounded-lg shadow-lg flex items-center justify-center">
            <p className="text-slate-400">Carregando biblioteca de gráficos...</p>
        </div>
    );
  }
  
  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = Recharts;
  
  return (
    <div className="w-full h-96 bg-slate-800 p-4 rounded-lg shadow-lg">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis dataKey="month" tick={{ fill: '#94a3b8' }} />
          <YAxis tick={{ fill: '#94a3b8' }} />
          <Tooltip 
            content={customTooltip || <Recharts.Tooltip />}
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} 
            cursor={{ fill: 'rgba(71, 85, 105, 0.5)' }} 
          />
          <Legend wrapperStyle={{ color: '#e2e8f0' }} />
          <Bar dataKey="pontosGanhos" name="Pontos Ganhos" fill="#22c55e" />
          <Bar dataKey="pontosResgatados" name="Pontos Resgatados" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HistoryChart;