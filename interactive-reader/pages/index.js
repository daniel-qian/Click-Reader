import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Reader from '../components/Reader';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>互动阅读器示例</title>
        <meta name="description" content="阅读器互动小圆点按钮示例" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className={styles.header}>
        <h1 className={styles.title}>
          互动阅读器示例
        </h1>
        <Link href="/history" className={styles.historyLink}>
          📚 生成历史
        </Link>
      </header>

      <main className={styles.main}>
        <p className={styles.description}>
          在文本中自动添加互动小圆点，点击即可查看AI生成的图像
        </p>

        <div className={styles.readerContainer}>
          <Reader />
        </div>
      </main>

      <footer className={styles.footer}>
        <p>Click 阅读器概念演示</p>
      </footer>
    </div>
  );
}