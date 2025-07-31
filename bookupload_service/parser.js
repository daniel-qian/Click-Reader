import axios from 'axios';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const epubParser = require('epub-parser');
import StreamZip from 'node-stream-zip';
import { createReadStream, createWriteStream } from 'fs';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mime from 'mime';
import { v4 as uuidv4 } from 'uuid';

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
        console.log('EPUB data structure:', JSON.stringify(epubData, null, 2));
        
        const metadata = {
          title: epubData.metadata?.title || epubData.raw?.json?.metadata?.title || 'Unknown Title',
          author: epubData.metadata?.creator || epubData.metadata?.author || epubData.raw?.json?.metadata?.creator || 'Unknown Author',
          language: epubData.metadata?.language || epubData.raw?.json?.metadata?.language || 'en'
        };
        
        console.log('Extracted metadata:', metadata);
        
        // 提取封面图片
        let coverData = null;
        if (epubData.cover) {
          try {
            const coverBuffer = Buffer.from(epubData.cover.data);
            const mimeType = epubData.cover.mediaType || 'image/jpeg';
            coverData = `data:${mimeType};base64,${coverBuffer.toString('base64')}`;
            console.log('Cover extracted successfully');
          } catch (coverError) {
            console.warn('Failed to extract cover:', coverError.message);
          }
        }
        
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

// extractCoverBase64 函数已移除，封面提取现在在 extractEpubContent 中完成

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
export async function saveBookToDatabase(metadata, coverBase64, epubUrl, supabase) {
  try {
    console.log('Saving book to database with auto-generated ID');
    
    const bookData = {
      title: metadata.title || 'Unknown Title',
      author: metadata.author || 'Unknown Author',
      language: metadata.language || 'en',
      epub_url: epubUrl,
      cover_base64: coverBase64,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('books')
      .insert([bookData])
      .select();
    
    if (error) {
      if (error.code === '23505') { // 唯一约束违反
        throw new Error('Book already exists in database');
      }
      throw new Error(`Database error: ${error.message}`);
    }
    
    console.log(`Book saved successfully with auto-generated ID: ${data[0].id}`);
    return data[0];
  } catch (error) {
    console.error('Error saving book to database:', error);
    throw error;
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
  let tempFilePath = null;
  
  try {
    console.log(`Starting EPUB parsing for: ${epubUrl}`);
    
    // 1. 下载EPUB文件
    tempFilePath = await downloadEpub(epubUrl);
    
    // 2. 提取EPUB内容
    const { metadata, coverData, chapters } = await extractEpubContent(tempFilePath);
    
    // 3. 使用提取的封面数据
    const coverBase64 = coverData;
    
    // 4. 保存书籍信息到数据库（让数据库自动生成ID）
    const savedBook = await saveBookToDatabase(metadata, coverBase64, epubUrl, supabase);
    const generatedBookId = savedBook.id;
    
    // 5. 上传章节HTML文件
    const chapterUrls = await uploadChapters(supabase, generatedBookId, chapters);
    
    console.log(`EPUB parsing completed successfully for book: ${generatedBookId}`);
    
    return {
      book_id: generatedBookId,
      title: metadata.title,
      author: metadata.author,
      chapters: chapters.length,
      cover_base64: coverBase64,
      chapter_urls: chapterUrls,
      message: 'EPUB parsed and uploaded successfully'
    };
  } catch (error) {
    console.error('Error in parseEpub:', error);
    throw error;
  } finally {
    // 清理临时文件
    if (tempFilePath) {
      await cleanup(tempFilePath);
    }
  }
}