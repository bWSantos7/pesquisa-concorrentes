"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginGestor } from "../actions";

export default function LoginGestorPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    setErro(null); setCarregando(true);
    const r = await loginGestor(email, senha);
    setCarregando(false);
    if (r.ok) router.push("/gestor");
    else setErro(r.erro);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-brand">Área do gestor</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Entrar</h1>
      </div>
      <div className="grid gap-4">
        <div>
          <label className="rotulo" htmlFor="email">E-mail</label>
          <input id="email" type="email" className="campo" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="rotulo" htmlFor="senha">Senha</label>
          <input id="senha" type="password" className="campo" autoComplete="current-password"
            value={senha} onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && entrar()} />
        </div>
        {erro && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}
        <button className="btn-primary" onClick={entrar} disabled={carregando}>
          {carregando ? "Entrando…" : "Entrar"}
        </button>
      </div>
    </main>
  );
}
