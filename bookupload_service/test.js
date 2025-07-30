// 简单的服务测试脚本
import axios from 'axios';

const BASE_URL = process.env.TEST_URL || 'http://localhost:8082';
const TEST_EPUB_URL = process.env.TEST_EPUB_URL || 'https://www.gutenberg.org/ebooks/74.epub.noimages';

async function testHealthCheck() {
  console.log('🔍 测试健康检查接口...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ 健康检查通过:', response.data);
    return true;
  } catch (error) {
    console.error('❌ 健康检查失败:', error.message);
    return false;
  }
}

async function testEpubExtraction() {
  console.log('📚 测试 EPUB 解析接口...');
  try {
    const response = await axios.post(`${BASE_URL}/extract`, {
      epub_url: TEST_EPUB_URL
    }, {
      timeout: 60000 // 60秒超时
    });
    
    console.log('✅ EPUB 解析成功:');
    console.log(`   书籍ID: ${response.data.book_id}`);
    console.log(`   章节数: ${response.data.chapters}`);
    console.log(`   书名: ${response.data.title}`);
    console.log(`   作者: ${response.data.author}`);
    if (response.data.cover_url) {
      console.log(`   封面: ${response.data.cover_url}`);
    }
    return true;
  } catch (error) {
    console.error('❌ EPUB 解析失败:');
    if (error.response) {
      console.error(`   状态码: ${error.response.status}`);
      console.error(`   错误信息: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   错误: ${error.message}`);
    }
    return false;
  }
}

async function testInvalidRequest() {
  console.log('🚫 测试无效请求处理...');
  try {
    await axios.post(`${BASE_URL}/extract`, {});
    console.error('❌ 应该返回错误但没有');
    return false;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ 正确处理无效请求:', error.response.data);
      return true;
    } else {
      console.error('❌ 错误处理不正确:', error.message);
      return false;
    }
  }
}

async function runTests() {
  console.log(`🧪 开始测试服务: ${BASE_URL}\n`);
  
  const tests = [
    { name: '健康检查', fn: testHealthCheck },
    { name: '无效请求', fn: testInvalidRequest },
    { name: 'EPUB解析', fn: testEpubExtraction }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    const result = await test.fn();
    if (result) passed++;
  }
  
  console.log(`\n📊 测试结果: ${passed}/${total} 通过`);
  
  if (passed === total) {
    console.log('🎉 所有测试通过!');
    process.exit(0);
  } else {
    console.log('❌ 部分测试失败');
    process.exit(1);
  }
}

// 运行测试
runTests().catch(error => {
  console.error('💥 测试运行失败:', error);
  process.exit(1);
});