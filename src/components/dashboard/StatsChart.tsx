import React from 'react';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsData {
  label: string;
  value: number;
  change?: number;
  color: string;
}

interface StatsChartProps {
  title: string;
  data: StatsData[];
  className?: string;
}

const StatsChart: React.FC<StatsChartProps> = ({ title, data, className = '' }) => {
  const maxValue = Math.max(...data.map(item => item.value));

  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      </div>

      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-800">{item.value.toLocaleString()}</span>
                {item.change !== undefined && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${
                    item.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.change >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {Math.abs(item.change)}%
                  </div>
                )}
              </div>
            </div>
            
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${item.color}`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsChart;
