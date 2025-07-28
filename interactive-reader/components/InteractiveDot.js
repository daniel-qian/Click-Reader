import { useState, useRef, useEffect } from 'react';
import styles from '../styles/InteractiveDot.module.css';

export default function InteractiveDot({ onClick, onLongPress }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const longPressTimer = useRef(null);
  const audioRef = useRef(null);
  
  // 音效播放函数
  const playSound = (soundType) => {
    // 模拟不同类型的音效
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (soundType === 'click') {
      // 点击音效 - 短促的高音
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } else if (soundType === 'longpress') {
      // 长按音效 - 渐强的低音
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.15, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } else if (soundType === 'hover') {
      // 悬停音效 - 轻柔的中音
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.03, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.05);
    }
  };
  
  const handleMouseDown = () => {
    setIsPressed(true);
    setIsLongPressed(false);
    
    // 设置长按定时器
    longPressTimer.current = setTimeout(() => {
      setIsLongPressed(true);
      playSound('longpress');
      if (onLongPress) {
        onLongPress();
      }
    }, 800); // 800ms 长按触发
  };
  
  const handleMouseUp = () => {
    setIsPressed(false);
    
    // 清除长按定时器
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    // 如果不是长按，则执行普通点击
    if (!isLongPressed && onClick) {
      playSound('click');
      onClick();
    }
    
    setIsLongPressed(false);
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
    setIsLongPressed(false);
    
    // 清除长按定时器
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  
  const handleMouseEnter = () => {
    setIsHovered(true);
    playSound('hover');
  };
  
  // 清理定时器
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);
  
  return (
    <span 
      className={`${styles.dot} ${isHovered ? styles.hovered : ''} ${isPressed ? styles.pressed : ''} ${isLongPressed ? styles.longPressed : ''}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => e.preventDefault()} // 防止右键菜单
    >
      <span className={styles.innerDot}></span>
      {isLongPressed && (
        <span className={styles.longPressIndicator}>变化中...</span>
      )}
    </span>
  );
}