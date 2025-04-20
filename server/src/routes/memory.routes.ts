import express from 'express';
import { ChromaMemoryProvider } from '../services/MemoryService';
import { llmService } from '../services/LLMService/LLMService';

const router = express.Router();
const memoryProvider = new ChromaMemoryProvider();

// Initialize memory system
router.post('/initialize', async (req, res) => {
  try {
    await memoryProvider.initialize();
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to initialize memory:', error);
    res.status(500).json({ error: 'Failed to initialize memory system' });
  }
});

// Store memory
router.post('/store', async (req, res) => {
  try {
    const { content, type, metadata } = req.body;
    const memoryId = await memoryProvider.store(content, type, metadata);
    res.json({ id: memoryId });
  } catch (error) {
    console.error('Failed to store memory:', error);
    res.status(500).json({ error: 'Failed to store memory' });
  }
});

// Search memories
router.post('/search', async (req, res) => {
  try {
    const { query, options } = req.body;
    const results = await memoryProvider.search(query, options);
    res.json(results);
  } catch (error) {
    console.error('Failed to search memories:', error);
    res.status(500).json({ error: 'Failed to search memories' });
  }
});

export default router; 