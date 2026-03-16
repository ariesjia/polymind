"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
  RainbowKitProvider,
  RainbowKitAuthenticationProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createPolymindAuthAdapter, wagmiConfig } from "@/lib/rainbow";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const queryClient = new QueryClient();
const authAdapter = createPolymindAuthAdapter();

function PolymindAuthSync() {
  const { login, logout } = useAuth();
  useEffect(() => {
    const onAuth = (e: CustomEvent<{ token: string; user: { address: string; credits: number; hasTavilyKey: boolean } }>) => {
      login(e.detail.token, e.detail.user);
    };
    const onLogout = () => logout();
    window.addEventListener("polymind-auth", onAuth as EventListener);
    window.addEventListener("polymind-logout", onLogout);
    return () => {
      window.removeEventListener("polymind-auth", onAuth as EventListener);
      window.removeEventListener("polymind-logout", onLogout);
    };
  }, [login, logout]);
  return null;
}

function RainbowKitAuthBridge({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const status = loading ? "loading" : user ? "authenticated" : "unauthenticated";
  return (
    <RainbowKitAuthenticationProvider adapter={authAdapter} status={status}>
      <PolymindAuthSync />
      {children}
    </RainbowKitAuthenticationProvider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitAuthBridge>
          <RainbowKitProvider
            theme={darkTheme({
              accentColor: "#6366f1",
              accentColorForeground: "white",
              borderRadius: "large",
            })}
          >
            {children}
          </RainbowKitProvider>
        </RainbowKitAuthBridge>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
