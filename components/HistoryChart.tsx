import React from 'react';
import { HistoryEntry } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface HistoryChartProps {
  data: HistoryEntry[];
  customTooltip?: React.ReactElement;
}

const HistoryChart: React.FC<HistoryChartProps> = ({ data, customTooltip }) => {
  if (!data || data.length === 0) {
    return (
        <div className="w-full h-96 bg-slate-800 p-4 rounded-lg shadow-lg flex flex-col items-center justify-center border border-slate-700">
            <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            </div>
            <p className="text-slate-400 font-medium">Nenhum dado histórico disponível ainda.</p>
            <p className="text-slate-500 text-xs mt-2">Valide suas primeiras ações para ver o gráfico.</p>
        </div>
    );
  }
  
  return (
    <div className="w-full h-96 bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-700">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis 
            dataKey="month" 
            tick={{ fill: '#94a3b8', fontSize: 12 }} 
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <YAxis 
            tick={{ fill: '#94a3b8', fontSize: 12 }} 
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <Tooltip 
            content={customTooltip}
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} 
            cursor={{ fill: 'rgba(71, 85, 105, 0.2)' }} 
          />
          <Legend 
            verticalAlign="top" 
            align="right"
            wrapperStyle={{ paddingBottom: '20px', color: '#94a3b8', fontSize: '12px' }} 
          />
          <Bar 
            dataKey="pontosGanhos" 
            name="Pontos Ganhos" 
            fill="#6366f1" 
            radius={[4, 4, 0, 0]} 
            barSize={30}
          />
          <Bar 
            dataKey="pontosResgatados" 
            name="Pontos Resgatados" 
            fill="#f43f5e" 
            radius={[4, 4, 0, 0]} 
            barSize={30}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HistoryChart;
