import Ajv, { JSONSchemaType, ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import addKeywords from 'ajv-keywords';

export class SchemaValidator {
  private ajv: Ajv;
  private compiledSchemas: Map<string, ValidateFunction> = new Map();

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
      // Add coercion for better type handling
      coerceTypes: true,
      // Add useful defaults
      useDefaults: true,
      // Remove additional properties not in schema
      removeAdditional: true
    });
    
    // Add standard formats
    addFormats(this.ajv);
    // Add useful keywords like 'instanceof', 'range', etc
    addKeywords(this.ajv);
    
    this.addCustomFormats();
    this.addCustomKeywords();
  }

  private addCustomFormats() {
    // Existing formats
    this.ajv.addFormat('file-path', /^(?:[a-zA-Z]:|[\\/])?([^\\/]+[\\/])*[^\\/]*$/);
    this.ajv.addFormat('url-or-path', /^(https?:\/\/|(?:[a-zA-Z]:|[\\/])?[\\/]?)([^\\/]+[\\/])*[^\\/]*$/);
    this.ajv.addFormat('command', /^[a-zA-Z0-9_\-\.]+(\s+[a-zA-Z0-9_\-\.]+)*$/);

    // New formats for tool system
    this.ajv.addFormat('semver', /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/);
    this.ajv.addFormat('tool-name', /^[@a-zA-Z][\w-]*$/);
    this.ajv.addFormat('dependency-string', /^(@?[a-zA-Z][\w-]*\/)?[a-zA-Z][\w-]*@\d+\.\d+\.\d+$/);
  }

  private addCustomKeywords() {
    // Add custom keywords for tool-specific validation
    this.ajv.addKeyword({
      keyword: 'dependencyType',
      validate: (schema: string, data: string) => {
        return ['npm', 'tool', 'system'].includes(data);
      },
      errors: true
    });

    this.ajv.addKeyword({
      keyword: 'toolCategory',
      validate: (schema: string[], data: string) => {
        return schema.includes(data);
      },
      errors: true
    });
  }

  validateSchema(schema: any): { isValid: boolean; errors?: string[] } {
    try {
      const validate = this.ajv.compile(schema);
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        errors: [(error as Error).message]
      };
    }
  }

  validate(data: any, schema: any, schemaId?: string): { isValid: boolean; errors?: string[]; coercedData?: any } {
    try {
      let validate: ValidateFunction;

      if (schemaId && this.compiledSchemas.has(schemaId)) {
        validate = this.compiledSchemas.get(schemaId)!;
      } else {
        validate = this.ajv.compile(schema);
        if (schemaId) {
          this.compiledSchemas.set(schemaId, validate);
        }
      }

      const isValid = validate(data);

      if (!isValid) {
        const errors = validate.errors?.map((error: ErrorObject) => {
          const path = error.instancePath || 'input';
          const message = error.message || 'invalid value';
          return `${path} ${message}`;
        });
        return { isValid: false, errors, coercedData: data };
      }

      return { isValid: true, coercedData: data };
    } catch (error) {
      return {
        isValid: false,
        errors: [(error as Error).message],
        coercedData: data
      };
    }
  }

  // New method for validating tool metadata
  validateToolMetadata(metadata: any): { isValid: boolean; errors?: string[] } {
    const metadataSchema = {
      type: 'object',
      properties: {
        author: { type: 'string' },
        tags: { 
          type: 'array',
          items: { type: 'string' }
        },
        category: { type: 'string' },
        lastUsed: { type: 'number' },
        useCount: { type: 'number' },
        version: { type: 'string', format: 'semver' }
      },
      additionalProperties: false
    };

    return this.validate(metadata, metadataSchema);
  }

  // New method for validating dependencies
  validateDependencies(dependencies: any[]): { isValid: boolean; errors?: string[] } {
    const dependencySchema = {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'version', 'type'],
        properties: {
          name: { type: 'string', format: 'tool-name' },
          version: { type: 'string', format: 'semver' },
          type: { type: 'string', dependencyType: true },
          optional: { type: 'boolean' }
        }
      }
    };

    return this.validate(dependencies, dependencySchema);
  }

  // Clear cached schemas
  clearCache(): void {
    this.compiledSchemas.clear();
  }
}
