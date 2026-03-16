import { createAuthenticationAdapter } from "@rainbow-me/rainbowkit";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet } from "wagmi/chains";
import { createSiweMessage } from "viem/siwe";

const TOKEN_KEY = "polymind-jwt";

export function createPolymindAuthAdapter() {
  return createAuthenticationAdapter({
    getNonce: async () => {
      const res = await fetch("/api/auth/nonce");
      const { nonce } = await res.json();
      return nonce;
    },
    createMessage: ({ nonce, address, chainId }) => {
      return createSiweMessage({
        domain: typeof window !== "undefined" ? window.location.host : "",
        address,
        statement: "Sign in to PolyMind",
        uri: typeof window !== "undefined" ? window.location.origin : "",
        version: "1",
        chainId,
        nonce,
      });
    },
    verify: async ({ message, signature }) => {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });
      if (!res.ok) return false;
      const { token, user } = await res.json();
      if (typeof window !== "undefined") {
        localStorage.setItem(TOKEN_KEY, token);
        window.dispatchEvent(
          new CustomEvent("polymind-auth", { detail: { token, user } })
        );
      }
      return true;
    },
    signOut: async () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem(TOKEN_KEY);
        window.dispatchEvent(new CustomEvent("polymind-logout"));
      }
    },
  });
}

// 从 https://cloud.walletconnect.com/ 免费获取，用于 WalletConnect 扫码连接
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID";

export const wagmiConfig = getDefaultConfig({
  appName: "PolyMind",
  projectId,
  chains: [mainnet],
  ssr: true,
});
