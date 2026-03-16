import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReactQueryProvider } from "@/lib/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { ToastProvider } from "@/components/ui/Toast";
import { SafariDetect } from "@/components/SafariDetect";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Startr",
  description: "Connect investors with startups through ML-powered matching",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var u=navigator.userAgent,v=navigator.vendor;if(/^((?!chrome|android).)*safari/i.test(u)||(v==='Apple Computer, Inc.'&&!window.chrome))document.documentElement.setAttribute('data-safari','true');})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SafariDetect>
          <ReactQueryProvider>
            <AuthProvider>
              <WebSocketProvider>
                <ToastProvider>{children}</ToastProvider>
              </WebSocketProvider>
            </AuthProvider>
          </ReactQueryProvider>
        </SafariDetect>
      </body>
    </html>
  );
}
