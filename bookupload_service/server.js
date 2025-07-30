import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { parseEpub } from './parser.js';

const app = express();
app.use(express.json({ limit: '10mb' }));

// 环境变量验证
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ status: 'up', timestamp: new Date().toISOString() });
});

// EPUB解析接口
app.post('/extract', async (req, res) => {
  const { epub_url, book_id } = req.body;
  
  if (!epub_url) {
    return res.status(400).json({ 
      error: 'epub_url is required',
      code: 'MISSING_EPUB_URL'
    });
  }

  try {
    console.log(`Starting EPUB extraction for: ${epub_url}`);
    const result = await parseEpub(epub_url, book_id, supabase);
    console.log(`Successfully extracted book: ${result.book_id}`);
    return res.json(result);
  } catch (error) {
    console.error('EPUB extraction failed:', error);
    
    // 根据错误类型返回不同状态码
    if (error.message.includes('already exists')) {
      return res.status(409).json({ 
        error: error.message,
        code: 'BOOK_EXISTS'
      });
    }
    
    if (error.message.includes('download') || error.message.includes('fetch')) {
      return res.status(400).json({ 
        error: 'Failed to download EPUB file',
        code: 'DOWNLOAD_FAILED',
        details: error.message
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    code: 'UNHANDLED_ERROR'
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

const PORT = process.env.PORT || 8082;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`EPUB extractor service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});