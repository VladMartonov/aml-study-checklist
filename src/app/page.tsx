import Checklist from "@/components/Checklist";

export default function Home() {
  return (
    <>
      <header className="bg-navy-900 text-white">
        <div className="mx-auto w-full max-w-2xl px-4 pt-10 pb-20 sm:px-6">
          <span className="inline-block rounded-full bg-teal-500/15 px-3 py-1 text-xs font-semibold tracking-wide text-lime-200 ring-1 ring-teal-500/40">
            Shared demo checklist
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            AML Study Checklist
          </h1>
          <p className="mt-2 text-base text-slate-300">
            Keep track of your AML learning goals.
          </p>
        </div>
      </header>
      <main className="mx-auto -mt-12 w-full max-w-2xl px-4 pb-16 sm:px-6">
        <Checklist />
      </main>
    </>
  );
}
