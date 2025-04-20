import { Tool } from '../tools';

export const webScraperTool: Tool = {
  name: 'webScraper',
  description: 'A tool to scrape content from web pages using jsdom',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL of the webpage to scrape'
      },
      selector: {
        type: 'string',
        description: 'CSS selector to extract specific elements'
      }
    },
    required: ['url', 'selector']
  },
  outputSchema: {
    type: 'object',
    properties: {
      elements: {
        type: 'array',
        description: 'Array of text content from matched elements',
        properties: {
          items: {
            type: 'string',
            description: 'Text content of a matched element'
          }
        }
      }
    }
  },
  code: `
    async function execute({ url, selector }) {
      const { JSDOM } = await import('jsdom');
      const fetch = (await import('node-fetch')).default;
      
      console.log(\`Fetching content from \${url}\`);
      const response = await fetch(url);
      const html = await response.text();
      
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      const elements = Array.from(document.querySelectorAll(selector));
      const textContent = elements.map(el => el.textContent?.trim()).filter(Boolean);
      
      console.log(\`Found \${textContent.length} matching elements\`);
      return { elements: textContent };
    }
  `
}; 