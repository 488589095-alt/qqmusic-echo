import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Build With AI · 腾讯音乐首届高校 AI Hackathon｜参赛作品 · QQ音乐「回声」',
  description:
    'Build With AI · 腾讯音乐首届高校 AI Hackathon 参赛作品：QQ音乐「回声」。让音乐与现实中的记忆重新相遇。',
  icons: { icon: '/favicon.svg?v=homepage-radio-2' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
