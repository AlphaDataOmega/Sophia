import React from 'react';
import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  startDate?: number;
  endDate?: number;
  onChange: (start: number, end: number) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange
}) => {
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const start = new Date(e.target.value).getTime();
    onChange(start, endDate || start);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const end = new Date(e.target.value).getTime();
    onChange(startDate || end, end);
  };

  const formatDateForInput = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toISOString().split('T')[0];
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <div className="relative">
          <input
            type="date"
            value={formatDateForInput(startDate)}
            onChange={handleStartDateChange}
            className="w-full bg-gray-700 rounded px-3 py-2 pl-10"
          />
          <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
      </div>
      <span className="text-gray-400">to</span>
      <div className="flex-1">
        <div className="relative">
          <input
            type="date"
            value={formatDateForInput(endDate)}
            onChange={handleEndDateChange}
            min={formatDateForInput(startDate)}
            className="w-full bg-gray-700 rounded px-3 py-2 pl-10"
          />
          <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
      </div>
    </div>
  );
};
