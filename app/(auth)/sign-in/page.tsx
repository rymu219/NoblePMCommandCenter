import { redirect } from "next/navigation";
import { signIn, getCurrentUser } from "@/lib/auth";

async function signInAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  try {
    await signIn(email, password);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sign-in failed.";
    redirect(`/sign-in?error=${encodeURIComponent(msg)}`);
  }
  redirect("/");
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const existing = await getCurrentUser();
  if (existing) redirect("/");
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-sm flex-col justify-center px-6">
      <h1 className="font-serif text-3xl font-medium text-noble-black">
        Sign in
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Noble PM Command Center.
      </p>
      <form action={signInAction} className="mt-6 space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-noble-black">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-noble-red/40 focus:outline-none focus:ring-2 focus:ring-noble-red/20"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-noble-black">Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-noble-red/40 focus:outline-none focus:ring-2 focus:ring-noble-red/20"
          />
        </label>
        {error ? (
          <p className="rounded-md bg-noble-red/10 px-3 py-2 text-sm text-noble-red">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          className="w-full rounded-md bg-noble-black px-3 py-2 text-sm font-medium text-white hover:bg-noble-black/85"
        >
          Sign in
        </button>
      </form>
      <p className="mt-6 text-xs text-[var(--muted)]">
        Dev credentials (from seed): any of{" "}
        <span className="font-mono">ryan@nobleplastics.local</span>,{" "}
        <span className="font-mono">kenneth@nobleplastics.local</span>,{" "}
        <span className="font-mono">billy@nobleplastics.local</span>, etc.
        Password: <span className="font-mono">nobleplastics</span>.
      </p>
    </div>
  );
}
