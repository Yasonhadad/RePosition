import { searchFiltersSchema } from "@shared/schema";

export function parseCsvHeader(csvText: string): Record<string, number> {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  const header = lines[0].split(",").map(h => h.trim());
  const map: Record<string, number> = {};
  header.forEach((h, idx) => (map[h] = idx));
  return map;
}

export function buildFallbackData(csvText: string): Record<number, { name?: string | null; natural_pos?: string | null }> {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  const inMap = parseCsvHeader(csvText);
  const inputById: Record<number, { name?: string | null; natural_pos?: string | null }> = {};

  if (inMap["player_id"] !== undefined) {
    for (const line of lines.slice(1)) {
      const cols = line.split(",");
      const pid = parseInt((cols[inMap["player_id"]] || "").trim());
      if (!Number.isNaN(pid)) {
        inputById[pid] = {
          name: inMap["name"] !== undefined ? (cols[inMap["name"]] || null) : null,
          natural_pos: inMap["sub_position"] !== undefined ? (cols[inMap["sub_position"]] || null) : null,
        };
      }
    }
  }
  return inputById;
}

export function parseCompatibilityResults(csvOut: string, inputById: Record<number, any>) {
  const lines = csvOut.split(/\r?\n/).filter(l => l.trim().length > 0);
  const map = parseCsvHeader(csvOut);

  return lines.slice(1).map(line => {
    const cols = line.split(",");
    const pid = parseInt((cols[map["player_id"]] || "0").trim());
    const nameOut = map["name"] !== undefined ? (cols[map["name"]] || null) : null;
    const natOut = map["natural_pos"] !== undefined ? (cols[map["natural_pos"]] || null) : null;
    const fallback = inputById[pid] || {};

    return {
      player_id: pid,
      name: nameOut || fallback.name || null,
      natural_pos: natOut || fallback.natural_pos || null,
      status: "ok" as const,
      compatibility: {
        best_pos: cols[map["best_pos"]] || null,
        best_fit_score: cols[map["best_fit_score"]] ? parseFloat(cols[map["best_fit_score"]]) : null,
        st_fit: cols[map["st_fit"]] ? parseFloat(cols[map["st_fit"]]) : null,
        lw_fit: cols[map["lw_fit"]] ? parseFloat(cols[map["lw_fit"]]) : null,
        rw_fit: cols[map["rw_fit"]] ? parseFloat(cols[map["rw_fit"]]) : null,
        cm_fit: cols[map["cm_fit"]] ? parseFloat(cols[map["cm_fit"]]) : null,
        cdm_fit: cols[map["cdm_fit"]] ? parseFloat(cols[map["cdm_fit"]]) : null,
        cam_fit: cols[map["cam_fit"]] ? parseFloat(cols[map["cam_fit"]]) : null,
        lb_fit: cols[map["lb_fit"]] ? parseFloat(cols[map["lb_fit"]]) : null,
        rb_fit: cols[map["rb_fit"]] ? parseFloat(cols[map["rb_fit"]]) : null,
        cb_fit: cols[map["cb_fit"]] ? parseFloat(cols[map["cb_fit"]]) : null,
      }
    };
  });
}

export function parsePlayerId(params: { playerId?: string; id?: string }): number | null {
  const playerId = parseInt(params.playerId || params.id || "");
  return isNaN(playerId) ? null : playerId;
}

export function parseFilters(query: Record<string, any>) {
  const queryFilters: any = { ...query };

  const rawPage = query.page as string | undefined;
  const rawPageSize = query.pageSize as string | undefined;
  const page = rawPage !== undefined && !Number.isNaN(parseInt(rawPage)) ? parseInt(rawPage) : 1;
  const pageSize = rawPageSize !== undefined && !Number.isNaN(parseInt(rawPageSize)) ? parseInt(rawPageSize) : 0;

  delete queryFilters.page;
  delete queryFilters.pageSize;

  if (queryFilters.ageMin) {
    queryFilters.ageMin = parseInt(queryFilters.ageMin as string);
  }
  if (queryFilters.ageMax) {
    queryFilters.ageMax = parseInt(queryFilters.ageMax as string);
  }
  if (queryFilters.minCompatibility) {
    queryFilters.minCompatibility = parseFloat(queryFilters.minCompatibility as string);
  }

  return { filters: searchFiltersSchema.parse(queryFilters), page, pageSize };
}
