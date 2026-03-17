import "./globals.css";

export const metadata = {
  title: "Portfolio Dashboard",
  description: "Portfolio monitoring, rebalancing, and stress testing",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
