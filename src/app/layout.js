import "./app.css";
import { Analytics } from "@vercel/analytics/next"
export const metadata = {
  title: "Live Radio - Synced Playback",
  description: "Synchronized live radio web application powered by Vercel and Supabase",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <meta name="theme-color" content="#00000" />
      <head>
        <link rel="icon" type="image/svg+xml" href="/radio.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fira+Code&family=Inter:opsz,wght@14..32,100..900&family=Poppins:wght@300;400&display=swap"
          rel="stylesheet"
        />
      </head>
      <Analytics />
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased transition-colors duration-200 dark:bg-zinc-950 dark:text-zinc-100">
        {children}
      </body>
    </html>
  );
}
