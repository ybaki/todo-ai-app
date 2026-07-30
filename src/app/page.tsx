import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-4 text-center text-slate-100">
      <div className="max-w-xl space-y-4">
        <h1 className="text-3xl font-semibold">Akıllı Todo &amp; Takvim Planlayıcı</h1>
        <p className="text-slate-400">
          Yapılacak işi yaz; önceliğini, süresini ve ne zaman yapacağını birlikte
          çözelim.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          Başla
        </Link>
      </div>
    </main>
  );
}
