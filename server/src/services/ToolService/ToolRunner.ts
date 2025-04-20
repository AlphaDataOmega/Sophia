import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ToolResult {
  success: boolean;
  result: any;
  logs: string[];
  error?: string;
  executionTime: number;
}

interface PackageInfo {
  name: string;
  version?: string;
}

export class ToolRunner extends EventEmitter {
  constructor() {
    super();
  }

  async execute(
    code: string,
    input: any,
    requiredPackages: PackageInfo[] = []
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const logs: string[] = [];

    try {
      // Install any required packages first
      if (requiredPackages.length > 0) {
        await this.installPackages(requiredPackages);
      }

      // Create context with input and logging
      const context = {
        input,
        console: {
          log: (...args: any[]) => {
            const log = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            logs.push(log);
            this.emit('log', log);
          },
          error: (...args: any[]) => {
            const log = `ERROR: ${args.join(' ')}`;
            logs.push(log);
            this.emit('error', log);
          },
          warn: (...args: any[]) => {
            const log = `WARN: ${args.join(' ')}`;
            logs.push(log);
            this.emit('warn', log);
          }
        }
      };

      // Wrap code to handle async execution and context
      const wrappedCode = `
        (async function(context) {
          try {
            const { input, console } = context;
            ${code}
          } catch (error) {
            console.error('Tool execution error:', error);
            throw error;
          }
        })(${JSON.stringify(context)})
      `;

      // Execute the code directly
      const result = await eval(wrappedCode);

      return {
        success: true,
        result,
        logs,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        result: null,
        error: errorMessage,
        logs,
        executionTime: Date.now() - startTime
      };
    }
  }

  private async installPackages(packages: PackageInfo[]): Promise<void> {
    try {
      const packagesToInstall = packages.map(pkg => 
        pkg.version ? `${pkg.name}@${pkg.version}` : pkg.name
      );

      console.log(`Installing packages: ${packagesToInstall.join(', ')}`);
      
      const { stdout, stderr } = await execAsync(`npm install ${packagesToInstall.join(' ')}`);
      
      if (stdout) {
        this.emit('log', `Package installation output: ${stdout}`);
      }
      if (stderr) {
        this.emit('warn', `Package installation warnings: ${stderr}`);
      }

    } catch (error) {
      throw new Error(`Failed to install packages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async executeWithDependencies(
    code: string,
    input: any,
    dependencies: string[]
  ): Promise<ToolResult> {
    // Parse dependencies into package info
    const packages = dependencies.map(dep => {
      const [name, version] = dep.split('@');
      return { name, version };
    });

    return this.execute(code, input, packages);
  }
}
