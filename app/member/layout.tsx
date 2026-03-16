"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, Settings, History, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";

const navItems = [
  { href: "/member/history", label: "Analysis History", icon: History },
  { href: "/member/credits", label: "Credits", icon: Coins },
  { href: "/member/settings", label: "Settings", icon: Settings },
];

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)]">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 size={24} className="animate-spin text-zinc-400" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)]">
        <Header />
        <div className="mx-auto max-w-2xl px-6 py-16">
          <p className="text-center text-zinc-400">
            Please connect your wallet to access the member center.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <Header />
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10 md:flex-row">
        <aside className="shrink-0 md:w-52">
          <nav className="flex flex-row gap-2 md:flex-col md:gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
