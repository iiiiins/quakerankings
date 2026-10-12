import fetchAllRows from "./fetchAllRows";

// Fake PostgREST builder over `table` that enforces a server row cap.
const fakeBuilder = (table, cap, calls) => () => {
  const b = {
    order: () => b,
    range: (from, to) => {
      calls.push([from, to]);
      const end = Math.min(to, from + cap - 1);
      return Promise.resolve({ data: table.slice(from, end + 1), error: null });
    },
  };
  return b;
};

test("pages past the server cap until a short page", async () => {
  const table = Array.from({ length: 2032 }, (_, i) => ({ id: i + 1 }));
  const calls = [];
  const { data, error } = await fetchAllRows(fakeBuilder(table, 2000, calls));
  expect(error).toBeNull();
  expect(data).toHaveLength(2032);
  expect(new Set(data.map((r) => r.id)).size).toBe(2032);
  expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
});

test("exact multiple of the page size ends on an empty page", async () => {
  const table = Array.from({ length: 2000 }, (_, i) => ({ id: i }));
  const calls = [];
  const { data } = await fetchAllRows(fakeBuilder(table, 2000, calls));
  expect(data).toHaveLength(2000);
  expect(calls).toHaveLength(3);
});

test("returns the error and no data when a page fails", async () => {
  const err = { message: "boom" };
  const build = () => ({ order() { return this; }, range: () => Promise.resolve({ data: null, error: err }) });
  expect(await fetchAllRows(build)).toEqual({ data: null, error: err });
});
