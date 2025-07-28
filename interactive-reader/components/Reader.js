import { useState, useEffect } from 'react';
import styles from '../styles/Reader.module.css';
import InteractiveDot from './InteractiveDot';
import ImageModal from './ImageModal';

export default function Reader() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingVariation, setIsGeneratingVariation] = useState(false);
  const [currentDot, setCurrentDot] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // 清除旧的localStorage数据
  useEffect(() => {
    localStorage.removeItem('imageHistory');
  }, []);
  
  // 示例文本内容
  const bookContent = `
    # 第一章 初见

    那是一个寒冷的冬日，雪花纷纷扬扬地落下，覆盖了整个小镇。李明站在咖啡馆的窗前，望着窗外的雪景，心中充满了期待。他今天要见一个素未谋面的朋友，这个朋友是通过网络认识的，名叫安娜。
    
    咖啡馆里温暖如春，空气中弥漫着咖啡的香气。李明点了一杯拿铁，静静地等待着。就在这时，咖啡馆的门被推开，一个身穿红色大衣的女孩走了进来，她的长发上还沾着几片雪花。
    
    "你是李明吗？"女孩走到他的桌前，微笑着问道。
    
    "是的，你一定是安娜。"李明站起来，礼貌地伸出手。
    
    # 第二章 相知
    
    时光飞逝，李明和安娜的友谊日渐深厚。他们经常一起去图书馆，分享彼此喜欢的书籍。安娜喜欢诗歌，而李明则偏爱科幻小说。
    
    有一天，他们坐在公园的长椅上，安娜突然问道："你相信命运吗？"
    
    李明思考了一会儿，回答说："我相信选择比命运更重要。每一个选择都会带来不同的结果，而这些结果构成了我们的人生。"
    
    安娜点点头，若有所思。阳光透过树叶的缝隙洒在她的脸上，形成了斑驳的光影。
  `;

  // 互动点数据
  const interactivePoints = [
    {
      id: 1,
      position: { paragraph: 1, wordIndex: 30 },
      text: "雪花纷飞的咖啡馆里，一个男子静静地坐在窗边",
      imageUrl: "/images/demo-image.webp",
      imageDescription: "雪景咖啡馆场景",
      variationPrompt: "冬日咖啡馆，雪花飞舞，温暖室内，男子望向窗外"
    },
    {
      id: 2,
      position: { paragraph: 2, wordIndex: 50 },
      text: "一个身穿红色大衣的女孩走了进来",
      imageUrl: "/images/demo-image.webp",
      imageDescription: "身穿红色大衣的女孩",
      variationPrompt: "红色大衣女孩，长发飘雪，推门而入，优雅身姿"
    },
    {
      id: 3,
      position: { paragraph: 5, wordIndex: 40 },
      text: "他们经常一起去图书馆，分享彼此喜欢的书籍",
      imageUrl: "/images/demo-image.webp",
      imageDescription: "图书馆场景",
      variationPrompt: "安静图书馆，两人分享书籍，温馨阅读时光"
    },
    {
      id: 4,
      position: { paragraph: 8, wordIndex: 60 },
      text: "阳光透过树叶的缝隙洒在她的脸上，形成了斑驳的光影",
      imageUrl: "/images/demo-image.webp",
      imageDescription: "阳光透过树叶照在脸上的场景",
      variationPrompt: "斑驳阳光，树叶光影，女孩侧脸，若有所思"
    }
  ];
  
  // 播放翻页音效
  const playPageTurnSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 模拟翻页声音 - 低频噪音
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  };
  
  // 模拟AI图像生成
  const generateVariationImage = async (dot) => {
    setIsGeneratingVariation(true);
    setCurrentDot(dot);
    
    // 模拟生成过程
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 生成模拟的variation图像
    const variationImage = {
      id: Date.now(),
      originalDotId: dot.id,
      imageUrl: "/images/demo-image.webp",
      description: `${dot.imageDescription} - AI变化版本`,
      prompt: dot.variationPrompt,
      timestamp: new Date().toLocaleTimeString()
    };
    
    // 保存到localStorage
    const existingHistory = JSON.parse(localStorage.getItem('imageHistory') || '[]');
    const updatedHistory = [variationImage, ...existingHistory];
    localStorage.setItem('imageHistory', JSON.stringify(updatedHistory));
    setIsGeneratingVariation(false);
    setCurrentDot(null);
    
    // 自动显示生成的图像
    setIsAnimating(true);
    setTimeout(() => {
      setSelectedImage({
        src: variationImage.imageUrl,
        alt: variationImage.prompt,
        text: `${dot.text}\n\n🎨 AI变化版本: ${variationImage.prompt}`
      });
      setIsModalOpen(true);
      setIsAnimating(false);
    }, 100);
  };

  // 处理段落和互动点的渲染
  const renderContent = () => {
    // 将内容分割成段落
    const paragraphs = bookContent.split('\n').filter(p => p.trim() !== '');
    
    return paragraphs.map((paragraph, pIndex) => {
      // 查找当前段落中的互动点
      const dotsInParagraph = interactivePoints.filter(dot => 
        dot.position.paragraph === pIndex
      );
      
      if (dotsInParagraph.length === 0) {
        // 如果段落中没有互动点，直接返回段落
        return (
          <p key={pIndex} className={styles.paragraph}>
            {paragraph}
          </p>
        );
      } else {
        // 如果段落中有互动点，需要在特定位置插入互动点
        // 按位置排序互动点
        const sortedDots = [...dotsInParagraph].sort((a, b) => a.position.wordIndex - b.position.wordIndex);
        
        const elements = [];
        let lastIndex = 0;
        
        sortedDots.forEach((dot, dotIndex) => {
          // 添加互动点前的文本
          if (dot.position.wordIndex > lastIndex) {
            elements.push(
              <span key={`text-${pIndex}-${dotIndex}`}>
                {paragraph.substring(lastIndex, dot.position.wordIndex)}
              </span>
            );
          }
          
          // 添加互动点
          elements.push(
            <InteractiveDot 
              key={`dot-${dot.id}`}
              onClick={() => handleDotClick(dot)}
              onLongPress={() => generateVariationImage(dot)}
            />
          );
          
          lastIndex = dot.position.wordIndex;
        });
        
        // 添加最后一个互动点后的文本
        if (lastIndex < paragraph.length) {
          elements.push(
            <span key={`text-${pIndex}-end`}>
              {paragraph.substring(lastIndex)}
            </span>
          );
        }
        
        return (
          <p key={pIndex} className={styles.paragraph}>
            {elements}
          </p>
        );
      }
    });
  };

  // 处理互动点点击事件
  const handleDotClick = (dot) => {
    playPageTurnSound(); // 播放翻页音效
    
    // 触发点击动画
    setIsAnimating(true);
    
    setTimeout(() => {
      setSelectedImage({
        src: dot.imageUrl,
        alt: dot.text,
        text: dot.text
      });
      setIsModalOpen(true);
      setIsAnimating(false);
    }, 100);
  };


  


  return (
    <div className={styles.reader}>
      <div className={styles.content}>
        {renderContent()}
      </div>
      
      {isModalOpen && (
        <ImageModal
          image={selectedImage}
          onClose={() => setIsModalOpen(false)}
          isAnimating={isAnimating}
        />
      )}
    </div>
  );
}