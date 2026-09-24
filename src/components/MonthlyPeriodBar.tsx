import React from 'react';
import { Calendar, Clock, Filter, Layers } from 'lucide-react';
import { GST_MONTHS, MonthlyStats } from '../utils/periodUtils';
import { Language } from '../types';

interface MonthlyPeriodBarProps {
  selectedFY: string;
  selectedMonth: string;
  onSelectMonth: (monthKey: string) => void;
  monthlyStats?: MonthlyStats[];
  language?: Language;
  totalPeriodInvoices?: number;
}

export const MonthlyPeriodBar: React.FC<MonthlyPeriodBarProps> = ({
  selectedFY,
  selectedMonth,
  onSelectMonth,
  monthlyStats = [],
  language = 'en',
  totalPeriodInvoices = 0,
}) => {
  const getStatForMonth = (monthKey: string) => {
    return monthlyStats.find((s) => s.monthKey === monthKey);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E0E4DE] p-3.5 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2.5 border-b border-[#F1F3EE]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#EDF3EF] text-[#2D4A3E] flex items-center justify-center">
            <Clock className="w-4 h-4 text-[#8DA173]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1A2E25]">
                {language === 'hi' ? 'कर अवधि प्रबंधन (Month-Wise GSTR-2B Filing Periods)' : 'Return Period Management'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2D4A3E] text-white font-bold">
                {selectedFY}
              </span>
            </div>
            <span className="text-[10px] text-[#738276]">
              {selectedMonth === 'ALL'
                ? 'Showing Consolidated Annual Records (April to March)'
                : `Filtered to ${GST_MONTHS.find((m) => m.key === selectedMonth)?.label || selectedMonth} ${selectedFY}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[11px] text-[#738276] font-medium">Quick Filter:</span>
          <button
            onClick={() => onSelectMonth('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedMonth === 'ALL'
                ? 'bg-[#2D4A3E] text-white shadow-xs'
                : 'bg-[#F1F3EE] text-[#56655A] hover:bg-[#E2E6DF]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Full Financial Year</span>
          </button>
        </div>
      </div>

      {/* Fiscal Months (Apr -> Mar) Pills */}
      <div className="pt-2.5 grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
        {GST_MONTHS.filter((m) => m.key !== 'ALL').map((m) => {
          const isSelected = selectedMonth === m.key;
          const stat = getStatForMonth(m.key);
          const count = stat ? stat.totalInvoices : 0;
          const hasRisk = stat ? stat.missing2bCount > 0 : false;

          return (
            <button
              key={m.key}
              onClick={() => onSelectMonth(m.key)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-center group ${
                isSelected
                  ? 'bg-[#2D4A3E] text-white border-[#2D4A3E] shadow-xs ring-2 ring-[#8DA173]/40'
                  : 'bg-[#FAFBF9] hover:bg-[#F1F3EE] text-[#2D362E] border-[#E8ECE6]'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-[9px] font-mono uppercase font-bold ${
                    isSelected ? 'text-[#8DA173]' : 'text-[#738276]'
                  }`}
                >
                  {m.quarter}
                </span>
                {count > 0 && (
                  <span
                    className={`text-[9px] font-mono px-1 rounded-full font-bold ${
                      isSelected
                        ? 'bg-[#8DA173] text-white'
                        : hasRisk
                        ? 'bg-[#FCF0EE] text-[#C75D4E]'
                        : 'bg-[#EDF3EF] text-[#2D4A3E]'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </div>
              <span className={`text-xs font-bold mt-0.5 ${isSelected ? 'text-white' : 'text-[#1A2E25]'}`}>
                {m.short}
              </span>
              <span
                className={`text-[9px] truncate w-full ${
                  isSelected ? 'text-[#D3DCD6]' : 'text-[#738276]'
                }`}
              >
                {count > 0 ? `${count} Inv` : 'No Data'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
