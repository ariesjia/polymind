"use client";

import { useState } from "react";
import Link from "next/link";
import { SiweMessage } from "siwe";
import { createWalletClient, custom } from "viem";
import { mainnet } from "viem/chains";
import { useAuth } from "@/contexts/AuthContext";

export default function ConnectWallet() {
  const { user, login, logout, loading } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    setConnecting(true);
    try {
      const ethereum = (window as unknown as { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
      if (!ethereum) {
        setError("Please install MetaMask or another Web3 wallet");
        return;
      }

      const client = createWalletClient({
        transport: custom(ethereum as never),
        chain: mainnet,
      });

      const [address] = await client.requestAddresses();
      if (!address) {
        setError("No address selected");
        return;
      }

      const nonceRes = await fetch("/api/auth/nonce");
      const { nonce } = await nonceRes.json();

      const domain = window.location.host;
      const origin = window.location.origin;

      const siweMessage = new SiweMessage({
        domain,
        address,
        statement: "Sign in to PolyMind",
        uri: origin,
        version: "1",
        chainId: 1,
        nonce,
      });

      const messageToSign = siweMessage.prepareMessage();
      const signature = await client.signMessage({
        account: address,
        message: messageToSign,
      });

      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSign,
          signature,
        }),
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        setError(err.error || "Verification failed");
        return;
      }

      const { token, user: userData } = await verifyRes.json();
      login(token, userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-8 w-24 animate-pulse rounded-lg bg-white/[0.06]" />
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs font-medium text-zinc-300">
          {user.address.slice(0, 6)}...{user.address.slice(-4)}
        </span>
        <Link
          href="/member/credits"
          className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          {user.credits} credits
        </Link>
        <button
          onClick={logout}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition-all hover:bg-indigo-500/20 disabled:opacity-50"
      >
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && (
        <p className="text-[11px] text-red-400">{error}</p>
      )}
    </div>
  );
}
