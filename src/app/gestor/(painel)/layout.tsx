import Link from "next/link";
import { redirect } from "next/navigation";
import { gestorAtual } from "@/lib/auth/gestor";
import { logoutGestor } from "../actions";

// Seção 26: menu mínimo (Dashboard, Pesquisas, Agentes, Concorrentes,
// Empreendimentos) + Dados próprios.
const NAV = [
  { href: "/gestor", label: "Dashboard" },
  { href: "/gestor/pesquisas", label: "Pesquisas" },
  { href: "/gestor/agentes", label: "Agentes" },
  { href: "/gestor/concorrentes", label: "Concorrentes" },
  { href: "/gestor/empreendimentos", label: "Empreendimentos" },
  { href: "/gestor/dados-proprios", label: "Dados próprios" },
];

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const g = await gestorAtual();
  if (!g) redirect("/gestor/login");

  return (
    <div className="min-h-dvh">
      <header className="border-b border-black/[.06] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <nav className="flex items-center gap-1">
            <span className="mr-4 font-bold text-brand">Pesquisa</span>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink/70 hover:bg-black/5">
                {n.label}
              </Link>
            ))}
          </nav>
          <form action={logoutGestor}>
            <button className="btn-ghost">Sair ({g.nome})</button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
