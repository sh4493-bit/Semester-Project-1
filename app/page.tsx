import { LandingPage } from "@/components/landing-page";
import { TopNavbar } from "@/components/top-navbar";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

const NEW_STYLE_MIN_STUDY_ID = 7;

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LandingPage />;
  }

  const [
    { data: studies, error: studiesError },
    { data: newStyleStudies, error: newStyleStudiesError },
  ] = await Promise.all([
    supabase.from("studies").select("id").order("id", { ascending: false }).limit(1),
    supabase
      .from("studies")
      .select("id")
      .gte("id", NEW_STYLE_MIN_STUDY_ID)
      .order("id", { ascending: false })
      .limit(1),
  ]);

  // The study tables may not exist in every Supabase project; the report
  // links are simply disabled in that case instead of crashing the home page.
  if (studiesError) console.warn(`Unable to load studies: ${studiesError.message}`);
  if (newStyleStudiesError) {
    console.warn(`Unable to load new style studies: ${newStyleStudiesError.message}`);
  }

  const latestStudyId = studies?.[0]?.id ?? null;
  const latestNewStyleStudyId = newStyleStudies?.[0]?.id ?? null;
  const additionalReports = [
    {
      title: "Study detail",
      description: "Review study vote details",
      href: latestStudyId ? `/study/${latestStudyId}/study-detail` : null,
    },
    {
      title: "Study engagement risk",
      description: "Find low-engagement raters",
      href: latestStudyId ? `/study/${latestStudyId}/engagement-risk` : null,
    },
    {
      title: "Study-to-study comparison",
      description: "Compare two studies",
      href: "/reports/study-comparison",
    },
    {
      title: "Weekly humor study summary",
      description: "Track weekly study trends",
      href: "/reports/weekly-study-summary",
    },
    {
      title: "Study voting span by user",
      description: "Review voting duration",
      href: latestStudyId ? `/study/${latestStudyId}/vote-timing` : null,
    },
    {
      title: "Study upvote percentage by user",
      description: "Compare individual upvote rates",
      href: latestStudyId ? `/study/${latestStudyId}/user-upvote-rate` : null,
    },
    {
      title: "Selected user report",
      description: "Analyze selected raters together",
      href: latestStudyId ? `/study/${latestStudyId}/selected-user-report` : null,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavbar />
      <main className="page-shell flex-1 flex items-center justify-center p-6">
        <section className="app-panel w-full max-w-2xl rounded-2xl p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="app-kicker text-xs font-semibold uppercase tracking-[0.24em]">
                Humor Study Stats
              </p>
              <h1 className="mt-3 text-3xl font-semibold">Dashboard</h1>
            </div>
          </div>

          <p className="app-muted mt-3 text-sm">
            Signed in as <span className="font-semibold text-foreground">{user?.email}</span>
          </p>

          <Link
            href="/profile"
            className="app-button mt-5 inline-flex min-h-11 items-center rounded-full px-5 py-2 text-sm font-semibold transition"
          >
            Create your humor page
          </Link>

          {latestStudyId ? (
            <>
          <div className="mt-8">
            {latestStudyId ? (
              <Link
                href={`/study/${latestStudyId}/study-detail`}
                className="app-button app-button-primary flex min-h-44 w-full items-center justify-center rounded-2xl px-8 py-10 text-center text-4xl font-semibold tracking-tight transition sm:text-5xl"
              >
                Latest Study
              </Link>
            ) : (
              <span className="app-button flex min-h-44 w-full cursor-not-allowed items-center justify-center rounded-2xl px-8 py-10 text-center text-4xl font-semibold tracking-tight opacity-60 sm:text-5xl">
                Latest Study
              </span>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <details className="group ml-auto flex w-full max-w-lg flex-col items-end">
              <summary className="app-button order-2 flex cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition marker:content-none">
                More reports
                <span className="text-xs transition group-open:rotate-180" aria-hidden="true">
                  &#9650;
                </span>
              </summary>
              <div className="app-card order-1 mb-3 grid w-full gap-2 rounded-xl p-3 sm:grid-cols-2">
                {additionalReports.map((reportOption) =>
                  reportOption.href ? (
                    <Link
                      key={reportOption.title}
                      href={reportOption.href}
                      className="app-button rounded-lg px-3 py-2 text-sm transition"
                    >
                      <span className="block font-medium">{reportOption.title}</span>
                      <span className="app-muted mt-0.5 block text-xs">
                        {reportOption.description}
                      </span>
                    </Link>
                  ) : (
                    <span
                      key={reportOption.title}
                      className="app-button cursor-not-allowed rounded-lg px-3 py-2 text-sm opacity-60"
                    >
                      <span className="block font-medium">{reportOption.title}</span>
                      <span className="app-muted mt-0.5 block text-xs">
                        {reportOption.description}
                      </span>
                    </span>
                  ),
                )}
              </div>
            </details>
          </div>
            </>
          ) : (
            <p className="app-muted mt-8 text-center text-sm">
              Study reports aren&apos;t available in this environment.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
