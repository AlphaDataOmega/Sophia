import { promises as fs } from 'fs';
import { join, dirname } from 'path';

export const fileSystemTool = {
  name: 'fileSystem',
  description: 'Perform basic file system operations like read, write, list files, etc.',
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['read', 'write', 'list', 'exists', 'delete']
      },
      path: { type: 'string' },
      content: { type: 'string' },
      encoding: { 
        type: 'string',
        enum: ['utf8', 'base64'],
        default: 'utf8'
      }
    },
    required: ['operation', 'path']
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: { type: 'any' },
      error: { type: 'string' }
    }
  },
  code: `
const fs = require('fs').promises;
const path = require('path');

module.exports = async function(input) {
  const { operation, path: filePath, content, encoding = 'utf8' } = input;
  
  // Ensure path is within workspace
  const workspacePath = process.cwd();
  const absolutePath = path.resolve(workspacePath, filePath);
  if (!absolutePath.startsWith(workspacePath)) {
    throw new Error('Access denied: Path must be within workspace');
  }
  
  try {
    console.log(\`Performing \${operation} operation on \${filePath}\`);
    
    switch (operation) {
      case 'read':
        const data = await fs.readFile(absolutePath, encoding);
        return { success: true, data };
        
      case 'write':
        if (!content) {
          throw new Error('Content is required for write operation');
        }
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, content, encoding);
        return { success: true };
        
      case 'list':
        const files = await fs.readdir(absolutePath);
        const stats = await Promise.all(
          files.map(async file => {
            const stat = await fs.stat(path.join(absolutePath, file));
            return {
              name: file,
              isDirectory: stat.isDirectory(),
              size: stat.size,
              modified: stat.mtime
            };
          })
        );
        return { success: true, data: stats };
        
      case 'exists':
        try {
          await fs.access(absolutePath);
          return { success: true, data: true };
        } catch {
          return { success: true, data: false };
        }
        
      case 'delete':
        await fs.unlink(absolutePath);
        return { success: true };
        
      default:
        throw new Error('Invalid operation');
    }
  } catch (error) {
    console.error(\`File system operation failed: \${error.message}\`);
    return {
      success: false,
      error: error.message
    };
  }
};
`
}; 