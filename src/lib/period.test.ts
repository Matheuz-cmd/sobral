import { describe, expect, it } from "vitest";
import { resolvePeriod } from "./period";

const today = "2026-10-21"; // quarta-feira

describe("resolvePeriod", () => {
  it("últimos 30 dias contra os 30 anteriores", () => {
    expect(resolvePeriod({ periodo: "30d" }, today)).toMatchObject({
      from: "2026-09-22", to: "2026-10-21", prevFrom: "2026-08-23", prevTo: "2026-09-21",
    });
  });

  it("esta semana (desde segunda) contra os mesmos dias da semana anterior", () => {
    expect(resolvePeriod({ periodo: "this_week" }, today)).toMatchObject({
      from: "2026-10-19", to: "2026-10-21", prevFrom: "2026-10-12", prevTo: "2026-10-14",
    });
  });

  it("este mês contra os mesmos dias do mês anterior", () => {
    expect(resolvePeriod({ periodo: "this_month" }, today)).toMatchObject({
      from: "2026-10-01", to: "2026-10-21", prevFrom: "2026-09-01", prevTo: "2026-09-21",
    });
    // 31 de março compara com fevereiro inteiro
    expect(resolvePeriod({ periodo: "this_month" }, "2026-03-31")).toMatchObject({
      prevFrom: "2026-02-01", prevTo: "2026-02-28",
    });
  });

  it("mês passado contra o mês anterior a ele", () => {
    expect(resolvePeriod({ periodo: "last_month" }, today)).toMatchObject({
      from: "2026-09-01", to: "2026-09-30", prevFrom: "2026-08-01", prevTo: "2026-08-31",
    });
  });

  it("personalizado, e volta ao padrão se as datas forem inválidas", () => {
    expect(resolvePeriod({ periodo: "custom", de: "2026-07-14", ate: "2026-07-20" }, today)).toMatchObject({
      from: "2026-07-14", to: "2026-07-20", prevFrom: "2026-07-07", prevTo: "2026-07-13",
    });
    expect(resolvePeriod({ periodo: "custom", de: "2026-07-20", ate: "2026-07-14" }, today).preset).toBe("30d");
  });
});
