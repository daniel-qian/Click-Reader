import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import EPub from 'epub-parser';
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
  try {
    console.log('Parsing EPUB metadata...');
    const epub = await EPub.parse(filePath);
    
    // 提取基本信息
    const metadata = {
      title: epub.metadata.title || 'Unknown Title',
      author: epub.metadata.creator || 'Unknown Author',
      language: epub.metadata.language || 'en',
      description: epub.metadata.description || null
    };
    
    // 提取封面
    let coverData = null;
    if (epub.metadata.cover) {
      try {
        const zip = new StreamZip.async({ file: filePath });
        const coverEntry = await zip.entry(epub.metadata.cover);
        if (coverEntry) {
          coverData = await zip.entryData(coverEntry);
        }
        await zip.close();
      } catch (error) {
        console.warn('Failed to extract cover:', error.message);
      }
    }
    
    // 提取章节内容
    console.log('Extracting chapters...');
    const chapters = [];
    
    for (let i = 0; i < epub.sections.length; i++) {
      const section = epub.sections[i];
      if (section.htmlContent) {
        chapters.push({
          index: i + 1,
          title: section.title || `Chapter ${i + 1}`,
          content: section.htmlContent,
          word_count: section.htmlContent.replace(/<[^>]*>/g, '').trim().split(/\s+/).length
        });
      }
    }
    
    return {
      metadata,
      coverData,
      chapters
    };
  } catch (error) {
    throw new Error(`Failed to parse EPUB: ${error.message}`);
  }
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