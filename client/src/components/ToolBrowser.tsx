import React, { useState, useEffect } from 'react';
import { Tool, toolService } from '../services/ToolService';
import { Search, Clock, Star, Tag, Edit, Trash, Play, BarChart2, X, Filter, Calendar, ChevronDown } from 'lucide-react';
import { CategoryManager } from './CategoryManager';
import { DateRangePicker } from './DateRangePicker';

interface ToolBrowserProps {
  onSelectTool: (tool: Tool) => void;
  onEditTool: (tool: Tool) => void;
  onDeleteTool: (tool: Tool) => void;
  onRunTool: (tool: Tool) => void;
}

export const ToolBrowser: React.FC<ToolBrowserProps> = ({
  onSelectTool,
  onEditTool,
  onDeleteTool,
  onRunTool
}) => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    total: number;
    recentlyUsed: Tool[];
    mostUsed: Tool[];
  } | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'recent' | 'most-used'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showMetrics, setShowMetrics] = useState<string | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedSearchOptions, setAdvancedSearchOptions] = useState<AdvancedSearchOptions>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<{
    start: number;
    end: number;
  } | null>(null);

  useEffect(() => {
    loadTools();
    loadStats();
  }, []);

  const loadTools = async () => {
    try {
      const toolList = await toolService.listTools();
      setTools(toolList);
    } catch (error) {
      console.error('Failed to load tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const toolStats = await toolService.getToolStats();
      setStats(toolStats);
    } catch (error) {
      console.error('Failed to load tool stats:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadTools();
      return;
    }

    try {
      const results = await toolService.findTool(searchQuery);
      setTools(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleAdvancedSearch = async () => {
    try {
      const results = await toolService.searchTools({
        query: searchQuery,
        ...advancedSearchOptions
      });
      setTools(results);
    } catch (error) {
      console.error('Advanced search failed:', error);
    }
  };

  const loadAvailableTags = async () => {
    try {
      const tags = await toolService.getAvailableTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const getDisplayTools = () => {
    let filteredTools = tools;
    
    // Filter by category
    if (selectedCategoryId) {
      filteredTools = filteredTools.filter(tool => tool.categoryId === selectedCategoryId);
    }

    // Apply existing filters
    if (filter === 'recent' && stats) {
      return stats.recentlyUsed;
    }
    if (filter === 'most-used' && stats) {
      return stats.mostUsed;
    }
    return filteredTools;
  };

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-gray-700 overflow-y-auto">
        <CategoryManager
          onSelectCategory={setSelectedCategoryId}
          selectedCategoryId={selectedCategoryId}
        />
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Search and filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search tools..."
              className="w-full px-4 py-2 pl-10 bg-gray-800 rounded-lg border border-gray-700"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded ${
                filter === 'all' ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('recent')}
              className={`px-3 py-1.5 rounded ${
                filter === 'recent' ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              <Clock size={18} />
            </button>
            <button
              onClick={() => setFilter('most-used')}
              className={`px-3 py-1.5 rounded ${
                filter === 'most-used' ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              <Star size={18} />
            </button>
          </div>
          <button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 ${
              showAdvancedSearch ? 'bg-purple-600' : 'bg-gray-700'
            }`}
          >
            <Filter size={16} />
            Filters
            <ChevronDown size={16} className={`transform transition-transform ${
              showAdvancedSearch ? 'rotate-180' : ''
            }`} />
          </button>
        </div>

        {showAdvancedSearch && (
          <div className="mb-6 bg-gray-800 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Tags</label>
                <select
                  multiple
                  value={selectedTags}
                  onChange={(e) => setSelectedTags(
                    Array.from(e.target.selectedOptions, option => option.value)
                  )}
                  className="w-full bg-gray-700 rounded px-3 py-2"
                >
                  {availableTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Author</label>
                <input
                  type="text"
                  value={advancedSearchOptions.author || ''}
                  onChange={(e) => setAdvancedSearchOptions({
                    ...advancedSearchOptions,
                    author: e.target.value
                  })}
                  className="w-full bg-gray-700 rounded px-3 py-2"
                  placeholder="Filter by author..."
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm mb-1">Date Range</label>
                <DateRangePicker
                  startDate={advancedSearchOptions.dateRange?.start}
                  endDate={advancedSearchOptions.dateRange?.end}
                  onChange={(start, end) => setAdvancedSearchOptions({
                    ...advancedSearchOptions,
                    dateRange: { start, end }
                  })}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={handleAdvancedSearch}
                className="px-4 py-2 bg-purple-600 rounded-lg"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Tool grid/list */}
        {loading ? (
          <div className="text-center py-8">Loading tools...</div>
        ) : (
          <div className={view === 'grid' ? 'grid grid-cols-3 gap-4' : 'space-y-4'}>
            {getDisplayTools().map((tool) => (
              <div
                key={tool.name}
                className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-medium">{tool.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowMetrics(tool.name)}
                      className="p-1 hover:bg-gray-700 rounded"
                    >
                      <BarChart2 size={16} />
                    </button>
                    <button
                      onClick={() => onRunTool(tool)}
                      className="p-1 hover:bg-gray-700 rounded"
                    >
                      <Play size={16} />
                    </button>
                    <button
                      onClick={() => onEditTool(tool)}
                      className="p-1 hover:bg-gray-700 rounded"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteTool(tool)}
                      className="p-1 hover:bg-gray-700 rounded text-red-400"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-3">{tool.description}</p>
                {tool.metadata?.tags && (
                  <div className="flex gap-2 flex-wrap">
                    {tool.metadata.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-700 rounded-full text-xs flex items-center gap-1"
                      >
                        <Tag size={12} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {tool.metadata?.useCount !== undefined && (
                  <div className="mt-2 text-xs text-gray-500">
                    Used {tool.metadata.useCount} times
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {showMetrics && (
        <ToolMetricsModal
          toolName={showMetrics}
          onClose={() => setShowMetrics(null)}
          timeRange={analyticsTimeRange}
          onTimeRangeChange={setAnalyticsTimeRange}
        />
      )}
    </div>
  );
};

interface ToolMetricsModalProps {
  toolName: string;
  onClose: () => void;
  timeRange: { start: number; end: number; } | null;
  onTimeRangeChange: (range: { start: number; end: number; } | null) => void;
}

const ToolMetricsModal: React.FC<ToolMetricsModalProps> = ({
  toolName,
  onClose,
  timeRange,
  onTimeRangeChange
}) => {
  const [metrics, setMetrics] = useState<ToolMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [toolName]);

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
      <div className="bg-gray-800 rounded-lg p-6 w-[600px]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium">Tool Metrics: {toolName}</h3>
          <div className="flex items-center gap-2">
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
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Execution Count</div>
            <div className="text-2xl font-medium">{metrics.executionCount}</div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Success Rate</div>
            <div className="text-2xl font-medium">
              {((1 - metrics.errorRate) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Avg. Execution Time</div>
            <div className="text-2xl font-medium">
              {metrics.averageExecutionTime.toFixed(2)}ms
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Last Executed</div>
            <div className="text-2xl font-medium">
              {new Date(metrics.lastExecuted).toLocaleDateString()}
            </div>
          </div>
        </div>

        {metrics.lastErrors.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-2">Recent Errors</h4>
            <div className="space-y-2">
              {metrics.lastErrors.map((error, i) => (
                <div key={i} className="bg-red-500/10 text-red-400 rounded-lg p-3 text-sm">
                  {error.error}
                  <div className="text-xs text-red-500 mt-1">
                    {new Date(error.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {metrics.popularInputPatterns.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Popular Patterns</h4>
            <div className="space-y-2">
              {metrics.popularInputPatterns.map((pattern, i) => (
                <div key={i} className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-sm mb-1">Pattern #{i + 1}</div>
                  <pre className="text-xs bg-gray-800 p-2 rounded">
                    {JSON.stringify(pattern.pattern, null, 2)}
                  </pre>
                  <div className="text-xs text-gray-400 mt-1">
                    Used {pattern.count} times
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
