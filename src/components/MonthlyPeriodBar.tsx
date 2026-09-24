import React, { useState } from 'react';
import { Calendar, Clock, Filter, Layers, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [isCompact, setIsCompact] = useState(false);

  const getStatForMonth = (monthKey: string) => {
    return monthlyStats.find((s) => s.monthKey === monthKey);
  };

  const selectedMonthObj = GST_MONTHS.find((m) => m.key === selectedMonth);

  return (
    <div className="bg-white rounded-xl border border-[#E0E4DE] p-3 shadow-2xs transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#EDF3EF] text-[#2D4A3E] flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5 text-[#8DA173]" />
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs font-bold text-[#1A2E25]">
              {language === 'hi' ? 'कर अवधि' : 'Return Period'}:
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2D4A3E] text-white font-bold">
              {selectedFY}
            </span>
            <span className="text-xs font-bold text-[#8DA173] truncate">
              {selectedMonth === 'ALL'
                ? 'All Months (Full FY)'
                : `${selectedMonthObj?.label || selectedMonth}`}
            </span>
            {totalPeriodInvoices > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#EDF3EF] text-[#2D4A3E] font-semibold">
                {totalPeriodInvoices} Records
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs shrink-0">
          <button
            type="button"
            onClick={() => onSelectMonth('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              selectedMonth === 'ALL'
                ? 'bg-[#2D4A3E] text-white shadow-xs'
                : 'bg-[#F1F3EE] text-[#56655A] hover:bg-[#E2E6DF]'
            }`}
            title="View all 12 months"
          >
            <Layers className="w-3 h-3" />
            <span>Full FY</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCompact(!isCompact)}
            className="px-2 py-1 rounded-lg text-[11px] font-semibold text-[#56655A] hover:text-[#1A2E25] bg-[#F1F3EE] hover:bg-[#E2E6DF] transition-colors flex items-center gap-1 cursor-pointer"
            title={isCompact ? 'Expand all 12 month cards' : 'Collapse to compact view'}
          >
            <span>{isCompact ? 'Grid' : 'Compact'}</span>
            {isCompact ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Fiscal Months (Apr -> Mar) */}
      {!isCompact ? (
        <div className="pt-2.5 grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 animate-in fade-in duration-150">
          {GST_MONTHS.filter((m) => m.key !== 'ALL').map((m) => {
            const isSelected = selectedMonth === m.key;
            const stat = getStatForMonth(m.key);
            const count = stat ? stat.totalInvoices : 0;
            const hasRisk = stat ? stat.missing2bCount > 0 : false;

            return (
              <button
                key={m.key}
                type="button"
                onClick={() => onSelectMonth(m.key)}
                className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border transition-all text-center cursor-pointer ${
                  isSelected
                    ? 'bg-[#2D4A3E] text-white border-[#2D4A3E] shadow-xs ring-1 ring-[#8DA173]/50'
                    : 'bg-[#FAFBF9] hover:bg-[#F1F3EE] text-[#2D362E] border-[#E8ECE6]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[8px] font-mono uppercase font-bold ${
                      isSelected ? 'text-[#8DA173]' : 'text-[#738276]'
                    }`}
                  >
                    {m.quarter}
                  </span>
                  {count > 0 && (
                    <span
                      className={`text-[8px] font-mono px-1 rounded-full font-bold ${
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
                <span className={`text-[11px] font-bold mt-0.5 ${isSelected ? 'text-white' : 'text-[#1A2E25]'}`}>
                  {m.short}
                </span>
                <span
                  className={`text-[8px] truncate w-full ${
                    isSelected ? 'text-[#D3DCD6]' : 'text-[#738276]'
                  }`}
                >
                  {count > 0 ? `${count} Inv` : '—'}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="pt-2 flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5 animate-in fade-in duration-150">
          {GST_MONTHS.filter((m) => m.key !== 'ALL').map((m) => {
            const isSelected = selectedMonth === m.key;
            const stat = getStatForMonth(m.key);
            const count = stat ? stat.totalInvoices : 0;
            const hasRisk = stat ? stat.missing2bCount > 0 : false;

            return (
              <button
                key={m.key}
                type="button"
                onClick={() => onSelectMonth(m.key)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-[#2D4A3E] text-white shadow-xs font-bold'
                    : 'bg-[#F7F8F6] hover:bg-[#EDF3EF] text-[#56655A] border border-[#E0E4DE]'
                }`}
              >
                <span>{m.short}</span>
                {count > 0 && (
                  <span
                    className={`text-[9px] font-mono px-1 rounded font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : hasRisk
                        ? 'bg-[#FCF0EE] text-[#C75D4E]'
                        : 'bg-[#E2E8DE] text-[#2D4A3E]'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
