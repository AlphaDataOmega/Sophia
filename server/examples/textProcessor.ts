export const textProcessorTool = {
  name: 'textProcessor',
  description: 'Process text with various operations like reverse, uppercase, lowercase, count words, etc.',
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['reverse', 'uppercase', 'lowercase', 'wordCount', 'trim', 'capitalize']
      },
      text: { type: 'string' }
    },
    required: ['operation', 'text']
  },
  outputSchema: {
    type: 'object',
    properties: {
      result: { type: 'string' },
      stats: {
        type: 'object',
        properties: {
          length: { type: 'number' },
          wordCount: { type: 'number' }
        }
      }
    }
  },
  code: `
module.exports = function(input) {
  const { operation, text } = input;
  
  console.log(\`Processing text with operation: \${operation}\`);
  
  let result = text;
  
  switch (operation) {
    case 'reverse':
      result = text.split('').reverse().join('');
      break;
    case 'uppercase':
      result = text.toUpperCase();
      break;
    case 'lowercase':
      result = text.toLowerCase();
      break;
    case 'wordCount':
      result = String(text.trim().split(/\\s+/).length);
      break;
    case 'trim':
      result = text.trim();
      break;
    case 'capitalize':
      result = text.toLowerCase().replace(/(^|\\s)\\w/g, c => c.toUpperCase());
      break;
    default:
      throw new Error('Invalid operation');
  }
  
  return {
    result,
    stats: {
      length: text.length,
      wordCount: text.trim().split(/\\s+/).length
    }
  };
};
`
}; 