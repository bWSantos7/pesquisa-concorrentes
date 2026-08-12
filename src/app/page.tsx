import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-12">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-brand">
          Pesquisa de mercado
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink">
          Estoque e vendas dos concorrentes
        </h1>
        <p className="mt-3 text-ink/60">
          Escolha por onde entrar.
        </p>
      </header>

      <div className="grid gap-4">
        <Link href="/agente" className="card group transition hover:border-brand/40">
          <p className="text-lg font-semibold text-ink">Sou Agente de Campo</p>
          <p className="mt-1 text-sm text-ink/60">
            Registrar coleta pelo meu telefone.
          </p>
        </Link>
        <Link href="/gestor" className="card group transition hover:border-brand/40">
          <p className="text-lg font-semibold text-ink">Sou Gestor</p>
          <p className="mt-1 text-sm text-ink/60">
            Acessar dashboard e pesquisas.
          </p>
        </Link>
      </div>
    </main>
  );
}
