import {
    login,
    signup,
  } from "@/app/login/actions";
  
  type LoginPageProps = {
    searchParams: Promise<{
      error?: string;
      message?: string;
    }>;
  };
  
  export default async function LoginPage({
    searchParams,
  }: LoginPageProps) {
    const { error, message } =
      await searchParams;
  
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6">
          <h1 className="text-3xl font-bold">
            Fantasy Draft Board
          </h1>
  
          <p className="mt-2 text-slate-400">
            Sign in to manage your draft.
          </p>
  
          {error && (
            <div className="mt-5 rounded-lg border border-red-700 bg-red-950/50 p-3 text-red-200">
              {error}
            </div>
          )}
  
          {message && (
            <div className="mt-5 rounded-lg border border-green-700 bg-green-950/50 p-3 text-green-200">
              {message}
            </div>
          )}
  
          <form className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm text-slate-300">
                Email
              </span>
  
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
              />
            </label>
  
            <label className="block">
              <span className="text-sm text-slate-300">
                Password
              </span>
  
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="current-password"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
              />
            </label>
  
            <div className="flex gap-3">
              <button
                formAction={login}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-500"
              >
                Log in
              </button>
  
              <button
                formAction={signup}
                className="flex-1 rounded-lg border border-slate-600 px-4 py-3 font-semibold hover:border-slate-400"
              >
                Sign up
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }