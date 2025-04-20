import { Injectable } from '@nestjs/common';
import { LLMService } from '../LLMService';
import { ToolService } from '../ToolService';
import { WorkflowSuggestion, WorkflowSuggestionRequest } from './types';

@Injectable()
export class LLMWorkflowService {
  constructor(
    private readonly llmService: LLMService,
    private readonly toolService: ToolService,
  ) {}

  private async generatePrompt(request: WorkflowSuggestionRequest): Promise<string> {
    const toolDescriptions = await this.toolService.getToolDescriptions();
    
    return `Given the following task description and available tools, suggest a workflow to accomplish the task.

Task Description: ${request.description}

Available Tools:
${request.availableTools.map(toolName => {
  const tool = toolDescriptions[toolName];
  return `- ${toolName}: ${tool?.description || 'No description available'}`;
}).join('\n')}

${request.context?.previousWorkflows ? `
Previous Workflows:
${request.context.previousWorkflows.join('\n')}
` : ''}

${request.context?.currentWorkflow ? `
Current Workflow:
${request.context.currentWorkflow}
` : ''}

Please provide workflow suggestions in the following format:
1. Name: A concise name for the workflow
2. Description: A brief description of what the workflow does
3. Steps: List of steps using available tools
4. Confidence: A number between 0-1 indicating how confident you are in this suggestion
5. Reasoning: Explanation of why this workflow would work well

Provide up to 3 different suggestions, ordered by confidence.`;
  }

  private parseResponse(response: string): WorkflowSuggestion[] {
    // This is a simple parser - in production you'd want more robust parsing
    const suggestions: WorkflowSuggestion[] = [];
    const suggestionBlocks = response.split(/Suggestion \d+:/g).filter(Boolean);
    
    for (const block of suggestionBlocks) {
      try {
        const name = block.match(/Name: (.*)/)?.[1]?.trim() || '';
        const description = block.match(/Description: (.*)/)?.[1]?.trim() || '';
        const confidence = parseFloat(block.match(/Confidence: ([\d.]+)/)?.[1] || '0');
        const reasoning = block.match(/Reasoning: ([\s\S]*?)(?=\n\n|$)/)?.[1]?.trim() || '';
        
        const stepsMatch = block.match(/Steps:([\s\S]*?)(?=\n(?:Confidence|Reasoning))/);
        const steps = stepsMatch?.[1]
          ?.trim()
          ?.split('\n')
          ?.filter(Boolean)
          ?.map(step => {
            const [toolName, ...descParts] = step.replace(/^\d+\.\s*/, '').split(':');
            return {
              toolName: toolName.trim(),
              description: descParts.join(':').trim(),
              input: {} // The LLM should provide suggested inputs, but we'll need to parse them
            };
          }) || [];

        if (name && steps.length > 0) {
          suggestions.push({
            name,
            description,
            steps,
            confidence,
            reasoning
          });
        }
      } catch (error) {
        console.error('Error parsing suggestion block:', error);
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  async getSuggestions(request: WorkflowSuggestionRequest): Promise<WorkflowSuggestion[]> {
    try {
      const prompt = await this.generatePrompt(request);
      const response = await this.llmService.complete(prompt, {
        temperature: 0.7, // Balance between creativity and consistency
        max_tokens: 1000,
        stop: ['Suggestion 4:'] // Limit to 3 suggestions
      });

      const suggestions = this.parseResponse(response);
      
      // Validate suggestions
      const validSuggestions = suggestions.filter(suggestion => 
        suggestion.steps.every(step => 
          request.availableTools.includes(step.toolName)
        )
      );

      return validSuggestions;
    } catch (error) {
      console.error('Error generating workflow suggestions:', error);
      throw new Error('Failed to generate workflow suggestions');
    }
  }

  async validateSuggestion(suggestion: WorkflowSuggestion): Promise<boolean> {
    try {
      // Validate each step's tool exists and inputs are valid
      for (const step of suggestion.steps) {
        const tool = await this.toolService.getTool(step.toolName);
        if (!tool) {
          return false;
        }
        
        // TODO: Validate tool inputs against tool schema
      }
      return true;
    } catch {
      return false;
    }
  }
} 