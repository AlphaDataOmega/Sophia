import React, { useState, useEffect } from 'react';
import { Tool, ToolVersion, ToolDependency, toolService } from '../services/ToolService';
import { Clock, GitBranch, Package, ArrowLeft, ArrowRight } from 'lucide-react';

interface ToolVersionHistoryProps {
  toolName: string;
  onVersionSelect: (version: string) => void;
}

export const ToolVersionHistory: React.FC<ToolVersionHistoryProps> = ({
  toolName,
  onVersionSelect
}) => {
  const [versions, setVersions] = useState<{ version: string; createdAt: number }[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [versionDetails, setVersionDetails] = useState<ToolVersion | null>(null);
  const [dependencies, setDependencies] = useState<ToolDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [diffView, setDiffView] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [toolName]);

  const loadVersions = async () => {
    try {
      const versionList = await toolService.listVersions(toolName);
      setVersions(versionList);
      if (versionList.length > 0) {
        selectVersion(versionList[0].version);
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectVersion = async (version: string) => {
    try {
      setSelectedVersion(version);
      const [details, deps] = await Promise.all([
        toolService.getVersion(toolName, version),
        toolService.resolveDependencies(toolName, version)
      ]);
      setVersionDetails(details);
      setDependencies(deps);
      onVersionSelect(version);
    } catch (error) {
      console.error('Failed to load version details:', error);
    }
  };

  const handleVersionChange = (direction: 'prev' | 'next') => {
    if (!selectedVersion) return;
    const currentIndex = versions.findIndex(v => v.version === selectedVersion);
    if (direction === 'prev' && currentIndex > 0) {
      selectVersion(versions[currentIndex - 1].version);
    } else if (direction === 'next' && currentIndex < versions.length - 1) {
      selectVersion(versions[currentIndex + 1].version);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading versions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          {versions.map(({ version, createdAt }) => (
            <button
              key={version}
              onClick={() => selectVersion(version)}
              className={`px-3 py-1.5 rounded-full flex items-center gap-2 ${
                selectedVersion === version
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              <GitBranch size={16} />
              {version}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleVersionChange('prev')}
            disabled={!selectedVersion || versions.indexOf(versions.find(v => v.version === selectedVersion)!) === 0}
            className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            <ArrowLeft size={16} />
          </button>
          <button
            onClick={() => handleVersionChange('next')}
            disabled={!selectedVersion || versions.indexOf(versions.find(v => v.version === selectedVersion)!) === versions.length - 1}
            className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => setDiffView(!diffView)}
            className={`px-3 py-1.5 rounded ${diffView ? 'bg-purple-600' : 'bg-gray-700'}`}
          >
            Show Diff
          </button>
        </div>
      </div>

      {versionDetails && (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <Clock size={16} />
            {new Date(versionDetails.createdAt).toLocaleDateString()}
            {versionDetails.author && ` • by ${versionDetails.author}`}
          </div>

          {versionDetails.changelog && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Changelog</h4>
              <pre className="text-sm bg-gray-900 p-3 rounded">
                {versionDetails.changelog}
              </pre>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium mb-2">Dependencies</h4>
            <div className="space-y-2">
              {dependencies.map((dep) => (
                <div
                  key={`${dep.name}@${dep.version}`}
                  className="flex items-center gap-2 text-sm"
                >
                  <Package size={16} className="text-gray-400" />
                  <span className="text-gray-300">{dep.name}</span>
                  <span className="text-gray-500">@{dep.version}</span>
                  <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">
                    {dep.type}
                  </span>
                  {dep.optional && (
                    <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">
                      optional
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
