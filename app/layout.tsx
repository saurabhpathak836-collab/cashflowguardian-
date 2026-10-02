import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CashFlow Guardian | Liquidity Forecasting",
  description: "A 13-week cash flow forecasting and liquidity early-warning prototype.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
