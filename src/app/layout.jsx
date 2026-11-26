import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "Shikor Web | Recursive Soundscapes",
  description: "Turn recursive algorithms into calm, generative musical soundscapes.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-[#080b09] text-neutral-100 selection:bg-white/15">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}