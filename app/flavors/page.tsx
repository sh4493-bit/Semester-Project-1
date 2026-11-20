import { TopNavbar } from "@/components/top-navbar";
import { createClient } from "@/utils/supabase/server";

export default async function HumorFlavorsPage() {
  const supabase = await createClient();
  const [{ data: flavors, error: flavorsError }, { data: captions, error: captionsError }] =
    await Promise.all([
      supabase.from("humor_flavors").select("id, slug, description"),
      supabase.from("captions").select("humor_flavor_id, like_count").limit(10000),
    ]);

  if (flavorsError) throw new Error(`Unable to load humor flavors: ${flavorsError.message}`);
  if (captionsError) throw new Error(`Unable to load captions: ${captionsError.message}`);

  const totals = new Map<string, { count: number; likes: number }>();
  for (const caption of captions ?? []) {
    if (!caption.humor_flavor_id) continue;
    const entry = totals.get(String(caption.humor_flavor_id)) ?? { count: 0, likes: 0 };
    entry.count += 1;
    entry.likes += caption.like_count ?? 0;
    totals.set(String(caption.humor_flavor_id), entry);
  }

  const rows = (flavors ?? [])
    .map((flavor) => {
      const entry = totals.get(String(flavor.id)) ?? { count: 0, likes: 0 };
      return {
        ...flavor,
        count: entry.count,
        likes: entry.likes,
        average: entry.count ? entry.likes / entry.count : 0,
      };
    })
    .sort((a, b) => b.likes - a.likes);

  return (
    <>
      <TopNavbar />
      <main className="page-shell min-h-screen px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="app-kicker text-xs font-semibold uppercase tracking-[0.24em]">Breakdown</p>
          <h1 className="mt-2 text-3xl font-semibold">Humor flavors</h1>
          <p className="app-muted mt-2 text-sm">Which styles of humor get the most love.</p>

          {rows.length === 0 ? (
            <div className="app-panel mt-8 rounded-3xl p-10 text-center text-sm">
              No humor flavors yet.
            </div>
          ) : (
            <div className="app-panel mt-8 overflow-x-auto rounded-3xl p-2">
              <table className="w-full text-left text-sm">
                <thead className="app-muted text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Flavor</th>
                    <th className="px-4 py-3">Captions</th>
                    <th className="px-4 py-3">Total likes</th>
                    <th className="px-4 py-3">Avg likes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={String(row.id)} className="border-t border-slate-400/20">
                      <td className="px-4 py-3">
                        <span className="font-medium capitalize">{row.slug.replace(/[-_]+/g, " ")}</span>
                        {row.description ? (
                          <span className="app-muted block text-xs">{row.description}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{row.count}</td>
                      <td className="px-4 py-3">{row.likes}</td>
                      <td className="px-4 py-3">{row.average.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
