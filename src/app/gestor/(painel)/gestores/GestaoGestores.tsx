"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import type { LinhaGestor } from "@/lib/data/gestor";
import { criarGestor, editarGestor, definirStatusGestor } from "../../actions";

export default function GestaoGestores({
  itens, idGestorAtual,
}: {
  itens: LinhaGestor[];
  idGestorAtual: string;
}) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<LinhaGestor | null>(null);
  const [erroStatus, setErroStatus] = useState<string | null>(null);

  function recarregar() { router.refresh(); }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Gestores</h1>
          <p className="text-sm text-ink/50">
            Quem tem acesso administrativo ao sistema. Sem exclusão física — apenas inativação.
          </p>
        </div>
        <button className="btn-primary !w-auto !py-2.5 !text-base" onClick={() => setCriando(true)}>
          Cadastrar gestor
        </button>
      </div>

      {erroStatus && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erroStatus}</p>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[.06] text-left text-ink/50">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Cadastro</th>
              <th className="px-4 py-3 font-medium">Cadastrado por</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ink/50">
                Nenhum gestor cadastrado.
              </td></tr>
            )}
            {itens.map((g) => {
              const ehVoce = g.id_gestor === idGestorAtual;
              return (
                <tr key={g.id_gestor} className="border-b border-black/[.04]">
                  <td className="px-4 py-3 font-medium text-ink">
                    {g.nome}{ehVoce && <span className="ml-2 rounded bg-brand/15 px-2 py-0.5 text-xs text-brand">você</span>}
                  </td>
                  <td className="px-4 py-3 text-ink/70">{g.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs ${
                      g.ativo ? "bg-brand/15 text-brand" : "bg-black/10 text-ink/50"
                    }`}>
                      {g.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink/60">
                    {new Date(g.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-ink/60">{g.criado_por ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="btn-ghost" onClick={() => setEditando(g)}>Editar</button>
                    <button className="btn-ghost disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={ehVoce && g.ativo}
                      title={ehVoce && g.ativo ? "Você não pode inativar a própria conta." : undefined}
                      onClick={async () => {
                        setErroStatus(null);
                        const r = await definirStatusGestor(g.id_gestor, !g.ativo);
                        if (!r.ok) setErroStatus(r.erro);
                        recarregar();
                      }}>
                      {g.ativo ? "Inativar" : "Ativar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(criando || editando) && (
        <FormGestor
          gestor={editando}
          onFechar={() => { setCriando(false); setEditando(null); }}
          onSalvo={() => { setCriando(false); setEditando(null); recarregar(); }}
        />
      )}
    </div>
  );
}

function FormGestor({
  gestor, onFechar, onSalvo,
}: {
  gestor: LinhaGestor | null;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const editandoExistente = Boolean(gestor);
  const [nome, setNome] = useState(gestor?.nome ?? "");
  const [email, setEmail] = useState(gestor?.email ?? "");
  const [senha, setSenha] = useState("");
  const [ativo, setAtivo] = useState(gestor?.ativo ?? true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro(null);
    if (!nome.trim() || !email.trim()) { setErro("Preencha nome e e-mail."); return; }
    if (!editandoExistente && senha.length < 8) { setErro("A senha deve ter pelo menos 8 caracteres."); return; }

    setSalvando(true);
    const r = editandoExistente
      ? await editarGestor(gestor!.id_gestor, { nome, email, senha: senha || undefined, ativo })
      : await criarGestor({ nome, email, senha, ativo });
    setSalvando(false);
    if (r.ok) onSalvo();
    else setErro(r.erro);
  }

  const titulo = editandoExistente ? "Editar gestor" : "Cadastrar gestor";
  return (
    <Modal titulo={titulo} onFechar={onFechar}>
      <h2 className="text-lg font-semibold text-ink">{titulo}</h2>
      <div className="mt-4 grid gap-4">
        <div>
          <label className="rotulo" htmlFor="g-nome">Nome</label>
          <input id="g-nome" className="campo !text-base !py-2" value={nome}
            onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <label className="rotulo" htmlFor="g-email">E-mail</label>
          <input id="g-email" className="campo !text-base !py-2" type="email" autoComplete="off" value={email}
            onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="rotulo" htmlFor="g-senha">
            {editandoExistente ? "Nova senha" : "Senha"}
          </label>
          <input id="g-senha" className="campo !text-base !py-2" type="password" autoComplete="new-password"
            value={senha} onChange={(e) => setSenha(e.target.value)} />
          <p className="mt-1 text-xs text-ink/40">
            {editandoExistente ? "Deixe em branco para manter a senha atual." : "Mínimo de 8 caracteres."}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Gestor ativo
        </label>
        {erro && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{erro}</p>}
      </div>
      <div className="mt-5 flex gap-3">
        <button className="flex-1 rounded-xl border border-black/10 py-3 font-medium" onClick={onFechar}>
          Cancelar
        </button>
        <button className="btn-primary flex-1 !py-3" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </Modal>
  );
}
