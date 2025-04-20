export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    required?: string[];
    properties: {
      [key: string]: {
        type: string;
        description?: string;
        enum?: string[];
        default?: any;
        additionalProperties?: any;
      };
    };
  };
  outputSchema: {
    type: string;
    required?: string[];
    properties: {
      [key: string]: {
        type?: string;
        description?: string;
        properties?: {
          [key: string]: {
            type: string;
            description?: string;
          };
        };
      };
    };
  };
  code: string;
}

export type ToolModalMode = 'create' | 'edit' | 'view'; 