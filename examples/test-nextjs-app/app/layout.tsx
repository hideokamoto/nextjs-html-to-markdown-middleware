export const metadata = {
  title: 'Test Next.js App',
  description: 'Testing next-markdown-middleware',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
