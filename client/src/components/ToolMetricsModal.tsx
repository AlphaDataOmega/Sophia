import React, { useState, useEffect } from 'react';
import { X, BarChart2, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { Tool, ToolMetrics, toolService } from '../services/ToolService';
import { DateRangePicker } from './DateRangePicker';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ToolMetricsModalProps {
  toolName: string;
  onClose: () => void;
  timeRange: { start: number; end: number; } | null;
  onTimeRangeChange: (range: { start: number; end: number; } | null) => void;
}

export const ToolMetricsModal: React.FC<ToolMetricsModalProps> = ({
  toolName,
  onClose,
  timeRange,
  onTimeRangeChange
}) => {
  const [metrics, setMetrics] = useState<ToolMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'errors'>('overview');

  useEffect(() => {
    loadMetrics();
  }, [toolName, timeRange]);

  const loadMetrics = async () => {
    try {
      const data = await toolService.getToolAnalytics(toolName, timeRange || undefined);
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!metrics) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-6 w-[800px] max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium">Tool Metrics: {toolName}</h3>
          <div className="flex items-center gap-4">
            <DateRangePicker
              startDate={timeRange?.start}
              endDate={timeRange?.end}
              onChange={(start, end) => onTimeRangeChange({ start, end })}
            />
            <button onClick={onClose} className="p-1.5 hover:bg-gray-700 rounded">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              activeTab === 'overview' ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            <BarChart2 size={16} />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              activeTab === 'usage' ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            <TrendingUp size={16} />
            Usage Patterns
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              activeTab === 'errors' ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            <AlertCircle size={16} />
            Error Analysis
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Execution Count</div>
                <div className="text-2xl font-medium">{metrics.executionStats.total}</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Success Rate</div>
                <div className="text-2xl font-medium">
                  {((metrics.executionStats.success / metrics.executionStats.total) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Avg. Execution Time</div>
                <div className="text-2xl font-medium">
                  {metrics.executionStats.averageTime.toFixed(2)}ms
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Version Distribution</div>
                <div className="text-sm mt-2">
                  {Object.entries(metrics.usageByVersion).map(([version, count]) => (
                    <div key={version} className="flex justify-between items-center mb-1">
                      <span>{version}</span>
                      <span className="text-gray-400">{count} executions</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-medium mb-4">Execution Trend</h4>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.executionTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="executions" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {activeTab === 'usage' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-4">Popular Input Patterns</h4>
              <div className="space-y-4">
                {metrics.popularInputPatterns.map((pattern, i) => (
                  <div key={i} className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium">Pattern #{i + 1}</div>
                      <div className="text-sm text-gray-400">Used {pattern.count} times</div>
                    </div>
                    <pre className="text-xs bg-gray-800 p-3 rounded overflow-x-auto">
                      {JSON.stringify(pattern.pattern, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-4">Error Types Distribution</h4>
              <div className="space-y-2">
                {metrics.errorTypes.map((error, i) => (
                  <div key={i} className="bg-gray-700/50 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div className="text-sm">{error.type}</div>
                      <div className="text-sm text-gray-400">{error.count} occurrences</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-4">Recent Errors</h4>
              <div className="space-y-2">
                {metrics.lastErrors.map((error, i) => (
                  <div key={i} className="bg-red-500/10 text-red-400 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} />
                      {error.error}
                    </div>
                    <div className="text-xs text-red-500 mt-1">
                      {new Date(error.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 