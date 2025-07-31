import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { parseEpub } from './parser.js';

const app = express();
app.use(express.json({ limit: '10mb' }));

// 验证必要的环境变量
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'SUPABASE_STORAGE_BUCKET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} environment variable is required`);
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

// 列出Supabase Storage中的EPUB文件
app.get('/epubs', async (req, res, next) => {
  try {
    const bucket = process.env.SUPABASE_STORAGE_BUCKET;
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .list('', {
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) {
      console.error('Error listing files:', error);
      return res.status(500).json({
        error: 'Failed to list files',
        code: 'STORAGE_ERROR'
      });
    }
    
    // 只过滤.epub文件
    const epubFiles = data.filter(file => file.name.toLowerCase().endsWith('.epub'));
    
    // 为每个文件构建完整URL
    const filesWithUrls = await Promise.all(epubFiles.map(async file => {
      const { data: { publicUrl } } = supabase
        .storage
        .from(bucket)
        .getPublicUrl(file.name);
        
      return {
        name: file.name,
        size: file.metadata?.size || file.size,
        created_at: file.created_at,
        updated_at: file.updated_at,
        url: publicUrl
      };
    }));
    
    res.json({
      files: filesWithUrls,
      total: filesWithUrls.length
    });
  } catch (err) {
    next(err);
  }
});

// EPUB解析接口
app.post('/extract', async (req, res, next) => {
  const { epub_url } = req.body;

  if (!epub_url) {
    return res.status(400).json({
      error: 'Missing epub_url parameter',
      code: 'MISSING_EPUB_URL'
    });
  }

  try {
    // 传递null作为book_id，让数据库自动生成ID
    const result = await parseEpub(epub_url, null, supabase);
    res.json(result);
  } catch (err) {
    console.error('Error processing EPUB:', err);
    
    // 根据错误类型返回不同的HTTP状态码和错误码
    if (err.message.includes('Book already exists')) {
      return res.status(409).json({
        error: 'Book already exists in the database',
        code: 'BOOK_EXISTS'
      });
    } else if (err.message.includes('Failed to download EPUB')) {
      return res.status(400).json({
        error: 'Failed to download EPUB file',
        code: 'DOWNLOAD_FAILED'
      });
    }
    
    next(err);
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