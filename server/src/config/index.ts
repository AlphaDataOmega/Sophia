import dotenv from 'dotenv';
import { Config } from './types';

// Load environment variables
dotenv.config();

const config: Config = {
  port: parseInt(process.env.PORT || '3001', 10),
  elevenLabsApiKey: process.env.ELEVEN_LABS_API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
};

// Validate required environment variables
const requiredEnvVars = ['ELEVEN_LABS_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

export default config; 