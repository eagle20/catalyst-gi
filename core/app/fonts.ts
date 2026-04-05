import { DM_Serif_Text, Inter, Roboto_Mono } from 'next/font/google';

export const inter = Inter({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-family-inter',
  fallback: ['Arial', 'Helvetica', 'sans-serif'],
});

export const dmSerifText = DM_Serif_Text({
  display: 'swap',
  subsets: ['latin'],
  weight: '400',
  variable: '--font-family-dm-serif-text',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});

export const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-family-roboto-mono',
  fallback: ['Courier New', 'monospace'],
});

export const fonts = [inter, dmSerifText, robotoMono];
