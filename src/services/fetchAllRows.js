// PostgREST caps every response at the project's max-rows (2,000 here), so a
// bare select() silently drops anything past it. fetchAllRows pages through
// with .range() over a stable order until a short page comes back.
// buildQuery must return a FRESH query builder each call (builders are
// single-use once awaited).
export const PAGE_SIZE = 1000;

export default async function fetchAllRows(buildQuery, pageSize = PAGE_SIZE) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery()
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) return { data: null, error };
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return { data: rows, error: null };
  }
}
