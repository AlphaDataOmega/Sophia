import express from 'express';
import { ToolRegistry } from '../services/ToolService/ToolRegistry';
import { Tool } from '../services/ToolService/types';
import { LLMRouter } from '../services/LLMService';

export function createToolRouter(toolRegistry: ToolRegistry, llmRouter: LLMRouter) {
  const router = express.Router();

  // List all tools
  router.get('/', async (req, res) => {
    try {
      const tools = await toolRegistry.listTools();
      res.json(tools);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to list tools'
      });
    }
  });

  // Get tool stats
  router.get('/stats', async (req, res) => {
    try {
      const stats = await toolRegistry.getToolStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get tool stats'
      });
    }
  });

  // Get specific tool
  router.get('/:name', async (req, res) => {
    try {
      const tools = await toolRegistry.findTool(req.params.name);
      if (tools.length === 0) {
        res.status(404).json({ error: 'Tool not found' });
        return;
      }
      res.json(tools[0]);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get tool'
      });
    }
  });

  // Create new tool
  router.post('/', async (req, res) => {
    try {
      const tool: Tool = req.body;
      await toolRegistry.addTool(tool);
      res.status(201).json(tool);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create tool'
      });
    }
  });

  // Update tool
  router.put('/:name', async (req, res) => {
    try {
      const updates: Partial<Tool> = req.body;
      await toolRegistry.updateTool(req.params.name, updates);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to update tool'
      });
    }
  });

  // Delete tool
  router.delete('/:name', async (req, res) => {
    try {
      await toolRegistry.deleteTool(req.params.name);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to delete tool'
      });
    }
  });

  // Execute tool
  router.post('/:name/run', async (req, res) => {
    try {
      const result = await toolRegistry.executeTool(req.params.name, req.body.input);
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to execute tool'
      });
    }
  });

  // Validate tool input
  router.post('/:name/validate-input', async (req, res) => {
    try {
      const tool = (await toolRegistry.findTool(req.params.name))[0];
      if (!tool) {
        res.status(404).json({ error: 'Tool not found' });
        return;
      }

      const validation = await toolRegistry['validateInput'](req.body.input, tool.inputSchema);
      res.json(validation);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to validate input'
      });
    }
  });

  // Suggest tool implementation
  router.post('/suggest', async (req, res) => {
    try {
      const tool = await toolRegistry.proposeNewTool(req.body.description);
      res.json(tool);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to suggest tool'
      });
    }
  });

  // Search tools
  router.get('/search/:query', async (req, res) => {
    try {
      const tools = await toolRegistry.findTool(req.params.query);
      res.json(tools);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to search tools'
      });
    }
  });

  // Create new version
  router.post('/:name/versions', async (req, res) => {
    try {
      const { version, ...data } = req.body;
      await toolRegistry.createVersion(req.params.name, version, data);
      res.status(201).json({ success: true });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create version'
      });
    }
  });

  // Get specific version
  router.get('/:name/versions/:version', async (req, res) => {
    try {
      const version = await toolRegistry.getVersion(req.params.name, req.params.version);
      if (!version) {
        res.status(404).json({ error: 'Version not found' });
        return;
      }
      res.json(version);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get version'
      });
    }
  });

  // List versions
  router.get('/:name/versions', async (req, res) => {
    try {
      const versions = await toolRegistry.listVersions(req.params.name);
      res.json(versions);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to list versions'
      });
    }
  });

  // Resolve dependencies
  router.get('/:name/dependencies', async (req, res) => {
    try {
      const dependencies = await toolRegistry.resolveDependencies(
        req.params.name,
        req.query.version as string
      );
      res.json(dependencies);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to resolve dependencies'
      });
    }
  });

  // Install dependencies
  router.post('/:name/install', async (req, res) => {
    try {
      const result = await toolRegistry.installDependencies(
        req.params.name,
        req.query.version as string
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to install dependencies'
      });
    }
  });

  // Category endpoints
  router.get('/categories', async (req, res) => {
    try {
      const categories = await toolRegistry.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get categories'
      });
    }
  });

  router.get('/categories/hierarchy', async (req, res) => {
    try {
      const hierarchy = await toolRegistry.getCategoryHierarchy();
      res.json(hierarchy);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get category hierarchy'
      });
    }
  });

  router.post('/categories', async (req, res) => {
    try {
      await toolRegistry.addCategory(req.body);
      res.status(201).json({ success: true });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create category'
      });
    }
  });

  router.put('/categories/:id', async (req, res) => {
    try {
      await toolRegistry.updateCategory(req.params.id, req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to update category'
      });
    }
  });

  router.delete('/categories/:id', async (req, res) => {
    try {
      await toolRegistry.deleteCategory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to delete category'
      });
    }
  });

  // Metrics endpoints
  router.get('/:name/metrics', async (req, res) => {
    try {
      const metrics = await toolRegistry.getToolMetrics(req.params.name);
      if (!metrics) {
        res.status(404).json({ error: 'Tool metrics not found' });
        return;
      }
      res.json(metrics);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get tool metrics'
      });
    }
  });

  // Enhanced validation endpoint
  router.post('/:name/validate-output', async (req, res) => {
    try {
      const tool = (await toolRegistry.findTool(req.params.name))[0];
      if (!tool) {
        res.status(404).json({ error: 'Tool not found' });
        return;
      }
      const validation = await toolRegistry['validateOutput'](req.body.output, tool.outputSchema);
      res.json(validation);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to validate output'
      });
    }
  });

  return router;
}
