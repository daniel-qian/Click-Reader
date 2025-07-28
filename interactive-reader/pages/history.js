import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../styles/History.module.css';
import ImageModal from '../components/ImageModal';

export default function History() {
  const [imageHistory, setImageHistory] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // 从localStorage加载历史记录
    const history = JSON.parse(localStorage.getItem('imageHistory') || '[]');
    setImageHistory(history);
  }, []);

  const handleImageClick = (item) => {
    setSelectedImage({
      src: item.imageUrl,
      alt: item.prompt,
      text: item.selectedText
    });
    setIsModalOpen(true);
  };

  const clearHistory = () => {
    localStorage.removeItem('imageHistory');
    setImageHistory([]);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← 返回阅读
        </Link>
        <h1 className={styles.title}>AI 图像生成历史</h1>
        {imageHistory.length > 0 && (
          <button onClick={clearHistory} className={styles.clearButton}>
            清空历史
          </button>
        )}
      </header>

      <main className={styles.main}>
        {imageHistory.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎨</div>
            <h2>暂无生成记录</h2>
            <p>在阅读页面长按圆点即可生成AI变化图像</p>
            <Link href="/" className={styles.startButton}>
              开始阅读
            </Link>
          </div>
        ) : (
          <div className={styles.historyGrid}>
            {imageHistory.map((item) => (
              <div 
                key={item.id} 
                className={styles.historyCard}
                onClick={() => handleImageClick(item)}
              >
                <div className={styles.imageContainer}>
                  <div className={styles.imagePlaceholder}>
                    {item.prompt.substring(0, 20)}...
                  </div>
                  <div className={styles.overlay}>
                    <span className={styles.viewText}>查看</span>
                  </div>
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{item.prompt}</h3>
                  <p className={styles.cardText}>
                    "{item.selectedText.substring(0, 50)}..."
                  </p>
                  <div className={styles.cardMeta}>
                    <span className={styles.timestamp}>{item.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {isModalOpen && (
        <ImageModal
          image={selectedImage}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}