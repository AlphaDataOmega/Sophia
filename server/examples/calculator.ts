export const calculatorTool = {
  name: 'calculator',
  description: 'A simple calculator that can perform basic arithmetic operations',
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['add', 'subtract', 'multiply', 'divide']
      },
      a: { type: 'number' },
      b: { type: 'number' }
    },
    required: ['operation', 'a', 'b']
  },
  outputSchema: {
    type: 'number'
  },
  code: `
module.exports = function(input) {
  const { operation, a, b } = input;
  
  console.log(\`Performing \${operation} on \${a} and \${b}\`);
  
  switch (operation) {
    case 'add':
      return a + b;
    case 'subtract':
      return a - b;
    case 'multiply':
      return a * b;
    case 'divide':
      if (b === 0) {
        throw new Error('Division by zero is not allowed');
      }
      return a / b;
    default:
      throw new Error('Invalid operation');
  }
};
`
}; 