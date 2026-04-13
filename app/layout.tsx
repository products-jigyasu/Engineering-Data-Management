import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';
import { ModalProvider } from '@/components/providers/modal-provider';

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Jigyasu — Engineering Design Management",
  description:
    "Manage the lifecycle of science experiments from functional testing through design completion and procurement.",
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/favicon.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body
        className="min-h-full"
        style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
      >
        {children}
        <ModalProvider />
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
