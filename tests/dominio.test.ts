import { describe, it, expect } from "vitest";
import { normalizarTelefone, telefoneValido } from "../src/lib/domain/telefone";
import {
  primeiroDiaDoMes,
  formatarCompetenciaCurta,
  formatarCompetenciaLonga,
  competenciaVigente,
} from "../src/lib/domain/competencia";

describe("Normalização de telefone (seção 5)", () => {
  it("remove espaços, hífens, parênteses e símbolos", () => {
    expect(normalizarTelefone("(11) 98888-7777")).toBe("11988887777");
    expect(normalizarTelefone("+55 12 3456-7890")).toBe("551234567890");
    expect(normalizarTelefone(" 12 3 4 5 ")).toBe("12345");
  });
  it("mesma saída para formatações diferentes do mesmo número", () => {
    expect(normalizarTelefone("11988887777")).toBe(
      normalizarTelefone("(11) 9 8888-7777"),
    );
  });
  it("valida comprimento plausível brasileiro", () => {
    expect(telefoneValido("(12) 98888-7777")).toBe(true);
    expect(telefoneValido("123")).toBe(false);
  });
});

describe("Competência mês/ano (seção 19)", () => {
  it("monta o primeiro dia do mês", () => {
    expect(primeiroDiaDoMes(2026, 8)).toBe("2026-08-01");
    expect(primeiroDiaDoMes(2026, 12)).toBe("2026-12-01");
  });
  it("formata curta e longa", () => {
    expect(formatarCompetenciaCurta("2026-08-01")).toBe("08/2026");
    expect(formatarCompetenciaLonga("2026-08-01")).toBe("Agosto/2026");
  });
  it("competência vigente sempre termina em -01 e é uma data válida", () => {
    const c = competenciaVigente();
    expect(c).toMatch(/^\d{4}-\d{2}-01$/);
    expect(Number.isNaN(Date.parse(c))).toBe(false);
  });
});
