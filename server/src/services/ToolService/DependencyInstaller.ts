import { exec } from 'child_process';
import { promisify } from 'util';
import { ToolDependency } from './types';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export class DependencyInstaller {
  private readonly npmCachePath: string;
  private readonly toolCachePath: string;

  constructor(
    private readonly workspacePath: string,
    private readonly toolRegistry: any // Will be ToolRegistry type
  ) {
    this.npmCachePath = path.join(workspacePath, '.tool-cache/npm');
    this.toolCachePath = path.join(workspacePath, '.tool-cache/tools');
  }

  async install(dependencies: ToolDependency[]): Promise<InstallationResult> {
    const results: InstallationResult = {
      success: true,
      installed: [],
      failed: [],
      logs: []
    };

    // Group dependencies by type
    const grouped = this.groupDependencies(dependencies);

    // Install each type in parallel
    try {
      await Promise.all([
        this.installNpmDependencies(grouped.npm, results),
        this.installToolDependencies(grouped.tool, results),
        this.installSystemDependencies(grouped.system, results)
      ]);
    } catch (error) {
      results.success = false;
      results.logs.push(`Installation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return results;
  }

  private groupDependencies(dependencies: ToolDependency[]) {
    return dependencies.reduce(
      (acc, dep) => {
        acc[dep.type].push(dep);
        return acc;
      },
      { npm: [], tool: [], system: [] } as Record<string, ToolDependency[]>
    );
  }

  private async installNpmDependencies(
    dependencies: ToolDependency[],
    results: InstallationResult
  ): Promise<void> {
    if (dependencies.length === 0) return;

    // Create package.json if it doesn't exist
    const packageJsonPath = path.join(this.npmCachePath, 'package.json');
    await fs.mkdir(this.npmCachePath, { recursive: true });
    
    try {
      await fs.access(packageJsonPath);
    } catch {
      await fs.writeFile(packageJsonPath, JSON.stringify({
        name: 'tool-dependencies',
        private: true,
        dependencies: {}
      }));
    }

    for (const dep of dependencies) {
      try {
        results.logs.push(`Installing npm package ${dep.name}@${dep.version}`);
        await execAsync(
          `npm install ${dep.name}@${dep.version} --save`,
          { cwd: this.npmCachePath }
        );
        results.installed.push({
          name: dep.name,
          version: dep.version,
          type: 'npm'
        });
      } catch (error) {
        if (!dep.optional) {
          results.success = false;
          results.failed.push({
            name: dep.name,
            version: dep.version,
            type: 'npm',
            error: error instanceof Error ? error.message : String(error)
          });
        }
        results.logs.push(`Failed to install ${dep.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async installToolDependencies(
    dependencies: ToolDependency[],
    results: InstallationResult
  ): Promise<void> {
    if (dependencies.length === 0) return;

    await fs.mkdir(this.toolCachePath, { recursive: true });

    for (const dep of dependencies) {
      try {
        results.logs.push(`Installing tool ${dep.name}@${dep.version}`);
        
        // Get tool from registry
        const tool = await this.toolRegistry.getVersion(dep.name, dep.version);
        if (!tool) {
          throw new Error(`Tool ${dep.name}@${dep.version} not found`);
        }

        // Save tool to cache
        const toolPath = path.join(this.toolCachePath, `${dep.name}@${dep.version}.json`);
        await fs.writeFile(toolPath, JSON.stringify(tool, null, 2));

        results.installed.push({
          name: dep.name,
          version: dep.version,
          type: 'tool'
        });
      } catch (error) {
        if (!dep.optional) {
          results.success = false;
          results.failed.push({
            name: dep.name,
            version: dep.version,
            type: 'tool',
            error: error instanceof Error ? error.message : String(error)
          });
        }
        results.logs.push(`Failed to install ${dep.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async installSystemDependencies(
    dependencies: ToolDependency[],
    results: InstallationResult
  ): Promise<void> {
    if (dependencies.length === 0) return;

    // Detect OS and package manager
    const packageManager = await this.detectPackageManager();
    if (!packageManager) {
      results.logs.push('No supported package manager found');
      return;
    }

    for (const dep of dependencies) {
      try {
        results.logs.push(`Installing system package ${dep.name}`);
        
        // Check if already installed
        const isInstalled = await this.checkSystemDependency(dep.name);
        if (isInstalled) {
          results.logs.push(`${dep.name} is already installed`);
          continue;
        }

        // Install using appropriate package manager
        await this.installWithPackageManager(packageManager, dep.name);
        
        results.installed.push({
          name: dep.name,
          version: dep.version,
          type: 'system'
        });
      } catch (error) {
        if (!dep.optional) {
          results.success = false;
          results.failed.push({
            name: dep.name,
            version: dep.version,
            type: 'system',
            error: error instanceof Error ? error.message : String(error)
          });
        }
        results.logs.push(`Failed to install ${dep.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async detectPackageManager(): Promise<string | null> {
    try {
      // Try different package managers
      const checks = [
        { cmd: 'apt -v', manager: 'apt' },
        { cmd: 'yum --version', manager: 'yum' },
        { cmd: 'brew -v', manager: 'brew' }
      ];

      for (const check of checks) {
        try {
          await execAsync(check.cmd);
          return check.manager;
        } catch {
          continue;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  private async checkSystemDependency(name: string): Promise<boolean> {
    try {
      await execAsync(`which ${name}`);
      return true;
    } catch {
      return false;
    }
  }

  private async installWithPackageManager(
    manager: string,
    packageName: string
  ): Promise<void> {
    const commands: Record<string, string> = {
      apt: `sudo apt-get install -y ${packageName}`,
      yum: `sudo yum install -y ${packageName}`,
      brew: `brew install ${packageName}`
    };

    const command = commands[manager];
    if (!command) {
      throw new Error(`Unsupported package manager: ${manager}`);
    }

    await execAsync(command);
  }

  async clean(): Promise<void> {
    // Clean up old cached dependencies
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Clean npm cache
    try {
      await execAsync('npm cache clean --force', { cwd: this.npmCachePath });
    } catch (error) {
      console.error('Failed to clean npm cache:', error);
    }

    // Clean tool cache
    try {
      const files = await fs.readdir(this.toolCachePath);
      for (const file of files) {
        const filePath = path.join(this.toolCachePath, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error('Failed to clean tool cache:', error);
    }
  }
}

interface InstallationResult {
  success: boolean;
  installed: {
    name: string;
    version: string;
    type: string;
  }[];
  failed: {
    name: string;
    version: string;
    type: string;
    error: string;
  }[];
  logs: string[];
}
