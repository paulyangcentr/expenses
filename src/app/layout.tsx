import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { FirebaseAuthProvider } from "@/components/providers/firebase-auth-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Expenses Tracker",
  description: "Track your expenses and manage your finances",
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
            __html: `
              // Disable error overlay
              if (typeof window !== 'undefined') {
                window.addEventListener('error', function(e) {
                  e.preventDefault();
                  return false;
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <FirebaseAuthProvider>
          {children}
          <Toaster />
        </FirebaseAuthProvider>
      </body>
    </html>
  );
}
