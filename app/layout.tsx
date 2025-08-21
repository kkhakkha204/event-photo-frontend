import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Event Photo Search - Tìm ảnh của bạn",
  description: "Hệ thống tìm kiếm ảnh sự kiện bằng nhận diện khuôn mặt",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        {/* Navigation */}
        <nav className="bg-gray-900 text-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-8">
                <Link href="/" className="font-bold text-xl">
                  Event Photos
                </Link>
                <div className="hidden md:flex gap-6">
                  <Link href="/" className="hover:text-gray-300 transition-colors">
                    Tìm Ảnh
                  </Link>
                  <Link href="/gallery" className="hover:text-gray-300 transition-colors">
                    Xem Tất Cả
                  </Link>
                  <Link href="/admin" className="hover:text-gray-300 transition-colors">
                    Admin
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}