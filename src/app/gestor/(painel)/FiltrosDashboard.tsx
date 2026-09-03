"use client";

import { useRouter } from "next/navigation";

type Item = { id: number; nome: string };

export default function FiltrosDashboard({
  mesAno, regional, idCidade, idEmp, regionais, cidades, emps,
}: {
  mesAno: string;
  regional: string;
  idCidade: string;
  idEmp: string;
  regionais: string[];
  cidades: Item[];
  emps: Item[];
}) {
  const router = useRouter();

  function navegar(next: Partial<{ mes: string; regional: string; cidade: string; emp: string }>) {
    const params = new URLSearchParams({ mes: mesAno });
    if (regional) params.set("regional", regional);
    if (idCidade) params.set("cidade", idCidade);
    if (idEmp) params.set("emp", idEmp);
    Object.entries(next).forEach(([k, v]) => (v ? params.set(k, v) : params.delete(k)));
    // Reset dependente
    if (next.regional !== undefined) { params.delete("cidade"); params.delete("emp"); }
    if (next.cidade !== undefined) { params.delete("emp"); }
    router.push(`/gestor?${params.toString()}`);
  }

  const mesInput = mesAno.slice(0, 7); // YYYY-MM

  return (
    <div className="card grid gap-4 sm:grid-cols-4">
      <div>
        <label className="rotulo">Competência</label>
        <input type="month" className="campo !px-2 !py-2 !text-sm" value={mesInput}
          onChange={(e) => navegar({ mes: `${e.target.value}-01` })} />
      </div>
      <div>
        <label className="rotulo">Regional</label>
        <select className="campo !text-base !py-2" value={regional}
          onChange={(e) => navegar({ regional: e.target.value })}>
          <option value="">Todas</option>
          {regionais.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className="rotulo">Cidade</label>
        <select className="campo !text-base !py-2" value={idCidade} disabled={!regional}
          onChange={(e) => navegar({ cidade: e.target.value })}>
          <option value="">Selecione…</option>
          {cidades.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>
      <div>
        <label className="rotulo">Empreendimento</label>
        <select className="campo !text-base !py-2" value={idEmp} disabled={!idCidade}
          onChange={(e) => navegar({ emp: e.target.value })}>
          <option value="">Todos (consolidado)</option>
          {emps.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </div>
    </div>
  );
}
