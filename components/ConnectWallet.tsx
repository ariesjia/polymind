"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";
import { useAuth } from "@/contexts/AuthContext";

export default function ConnectWallet() {
  const { user, loading, logout } = useAuth();
  const { disconnect } = useDisconnect();

  const handleLogout = () => {
    disconnect();
    logout();
  };

  if (loading) {
    return (
      <div className="h-10 w-28 animate-pulse rounded-xl bg-white/[0.06]" />
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/member/credits"
          className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          {user.credits} credits
        </Link>
        <Link
          href="/member"
          className="rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.1] hover:text-zinc-200"
        >
          {user.address.slice(0, 6)}...{user.address.slice(-4)}
        </Link>
        <button
          onClick={handleLogout}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
        >
          Logout
        </button>
      </div>
    );
  }

  return <ConnectButton chainStatus="none" showBalance={false} />;
}
