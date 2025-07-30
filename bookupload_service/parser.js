import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const epubParser = require('epub-parser');
import StreamZip from 'node-stream-zip';
import { createReadStream, createWriteStream } from 'fs';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mime from 'mime';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = join(__dirname, 'temp');

// 确保临时目录存在
try {
  await mkdir(TEMP_DIR, { recursive: true });
} catch (error) {
  // 目录已存在，忽略错误
}

/**
 * 下载EPUB文件到临时目录
 */
async function downloadEpub(epubUrl) {
  const tempFilePath = join(TEMP_DIR, `${uuidv4()}.epub`);
  
  try {
    console.log(`Downloading EPUB from: ${epubUrl}`);
    const response = await axios({
      method: 'GET',
      url: epubUrl,
      responseType: 'stream',
      timeout: 30000, // 30秒超时
      headers: {
        'User-Agent': 'Click-Reader EPUB Extractor/1.0'
      }
    });
    
    const writer = createWriteStream(tempFilePath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(tempFilePath));
      writer.on('error', reject);
    });
  } catch (error) {
    throw new Error(`Failed to download EPUB: ${error.message}`);
  }
}

/**
 * 解析EPUB文件获取元数据和章节
 */
async function extractEpubContent(filePath) {
  return new Promise((resolve, reject) => {
    console.log('Parsing EPUB metadata...');
    
    epubParser.open(filePath, function (err, epubData) {
      if (err) {
        return reject(new Error(`Failed to parse EPUB: ${err.message}`));
      }
      
      try {
        // 提取基本信息
        const metadata = {
          title: epubData.easy?.primaryID?.value || epubData.raw?.json?.metadata?.title || 'Unknown Title',
          author: epubData.raw?.json?.metadata?.creator || 'Unknown Author',
          language: epubData.raw?.json?.metadata?.language || 'en',
          description: epubData.raw?.json?.metadata?.description || null
        };
        
        // 提取封面 - epub-parser不直接提供封面数据，需要手动提取
        let coverData = null;
        
        // 提取章节内容
        console.log('Extracting chapters...');
        const chapters = [];
        
        // epub-parser提供的结构不同，需要从raw数据中提取
        if (epubData.raw && epubData.raw.json && epubData.raw.json.spine) {
          const spineItems = epubData.raw.json.spine;
          for (let i = 0; i < spineItems.length; i++) {
            const item = spineItems[i];
            if (item.href) {
              // 这里需要读取实际的HTML内容
              chapters.push({
                index: i + 1,
                title: `Chapter ${i + 1}`,
                content: `<p>Chapter content from ${item.href}</p>`, // 简化处理
                word_count: 100 // 简化处理
              });
            }
          }
        }
        
        resolve({
          metadata,
          coverData,
          chapters
        });
      } catch (error) {
        reject(new Error(`Failed to process EPUB data: ${error.message}`));
      }
    });
  });
}

/**
 * 上传封面到Supabase Storage
 */
async function uploadCover(supabase, bookId, coverData) {
  if (!coverData) return null;
  
  const bucketName = process.env.BUCKET_COVER || 'bookcovers';
  const fileName = `${bookId}.jpg`;
  
  try {
    console.log(`Uploading cover for book ${bookId}...`);
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, coverData, {
        contentType: 'image/jpeg',
        upsert: true
      });
    
    if (error) throw error;
    
    // 获取公开URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  } catch (error) {
    console.warn('Failed to upload cover:', error.message);
    return null;
  }
}

/**
 * 上传章节HTML到Supabase Storage
 */
async function uploadChapters(supabase, bookId, chapters) {
  const bucketName = process.env.BUCKET_HTML || 'bookhtml';
  const uploadPromises = [];
  
  for (const chapter of chapters) {
    const fileName = `${bookId}/chapters/${chapter.index}.html`;
    
    const uploadPromise = supabase.storage
      .from(bucketName)
      .upload(fileName, chapter.content, {
        contentType: 'text/html',
        upsert: true
      })
      .then(({ error }) => {
        if (error) {
          console.warn(`Failed to upload chapter ${chapter.index}:`, error.message);
        }
        return { index: chapter.index, success: !error };
      });
    
    uploadPromises.push(uploadPromise);
  }
  
  console.log(`Uploading ${chapters.length} chapters...`);
  const results = await Promise.all(uploadPromises);
  const successCount = results.filter(r => r.success).length;
  console.log(`Successfully uploaded ${successCount}/${chapters.length} chapters`);
  
  return results;
}

/**
 * 保存书籍信息到数据库
 */
async function saveBookToDatabase(supabase, bookId, metadata, epubUrl, coverUrl) {
  try {
    console.log(`Saving book ${bookId} to database...`);
    const { data, error } = await supabase
      .from('books')
      .insert({
        id: bookId,
        title: metadata.title,
        author: metadata.author,
        language: metadata.language,
        epub_url: epubUrl,
        cover_url: coverUrl,
        tags: [],
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') { // 唯一约束违反
        throw new Error(`Book with ID ${bookId} already exists`);
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    throw new Error(`Failed to save book to database: ${error.message}`);
  }
}

// 章节信息不再保存到数据库，仅上传到Storage

/**
 * 清理临时文件
 */
async function cleanup(filePath) {
  try {
    await unlink(filePath);
    console.log('Temporary file cleaned up');
  } catch (error) {
    console.warn('Failed to cleanup temporary file:', error.message);
  }
}

/**
 * 主解析函数
 */
export async function parseEpub(epubUrl, bookId, supabase) {
  const finalBookId = bookId || uuidv4();
  let tempFilePath = null;
  
  try {
    // 1. 下载EPUB文件
    tempFilePath = await downloadEpub(epubUrl);
    
    // 2. 解析EPUB内容
    const { metadata, coverData, chapters } = await extractEpubContent(tempFilePath);
    
    // 3. 上传封面
    const coverUrl = await uploadCover(supabase, finalBookId, coverData);
    
    // 4. 保存书籍信息到数据库
    await saveBookToDatabase(supabase, finalBookId, metadata, epubUrl, coverUrl);
    
    // 5. 上传章节HTML文件到Storage
    await uploadChapters(supabase, finalBookId, chapters);
    
    return {
      book_id: finalBookId,
      chapters: chapters.length,
      cover_url: coverUrl,
      title: metadata.title,
      author: metadata.author
    };
  } catch (error) {
    console.error('EPUB parsing failed:', error);
    throw error;
  } finally {
    // 清理临时文件
    if (tempFilePath) {
      await cleanup(tempFilePath);
    }
  }
}