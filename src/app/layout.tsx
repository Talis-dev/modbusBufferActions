import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Esteira Modbus - Sistema de Gerenciamento",
  description:
    "Sistema de gerenciamento de esteira distribuidora com controle Modbus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
