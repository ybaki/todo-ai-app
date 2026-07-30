import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-3">
        <Link href="/app" className="text-sm font-semibold">
          Akıllı Todo &amp; Takvim
        </Link>
        <nav className="flex items-center gap-4 text-sm text-slate-400">
          <span>{user.email}</span>
          <Link href="/app/settings" className="hover:text-slate-100">
            Ayarlar
          </Link>
          <SignOutButton />
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}
