import { Sidebar } from "../sidebar";
import { WalletProvider } from "@/lib/wallet-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WalletProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-56 min-h-screen">{children}</main>
      </div>
    </WalletProvider>
  );
}
