import { useEffect, useState } from 'react';
import styles from '../styles/ImageModal.module.css';

export default function ImageModal({ image, onClose, isAnimating = false }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    document.addEventListener('keydown', handleEscape);
    
    // 触发入场动画
    setTimeout(() => setIsVisible(true), 10);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  if (!image) return null;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // 等待退场动画完成
  };

  return (
    <div 
      className={`${styles.overlay} ${isVisible ? styles.visible : ''}`} 
      onClick={handleClose}
    >
      <div 
        className={`${styles.modal} ${isVisible ? styles.modalVisible : ''} ${isMobile ? styles.mobile : ''} ${isAnimating ? styles.animating : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <button className={styles.closeButton} onClick={handleClose}>
          ×
        </button>
        
        <div className={styles.imageContainer}>
          <img src={image.src} alt={image.alt} className={styles.image} />
          
          {/* 文字叠加在图片上 */}
          <div className={styles.textOverlay}>
            <div className={styles.overlayText}>
              {image.text}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}