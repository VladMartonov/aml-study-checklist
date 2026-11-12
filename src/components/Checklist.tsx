"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TITLE_MAX_LENGTH, validateTitle, type Task } from "@/lib/tasks";

const REFRESH_INTERVAL_MS = 10_000;
const GENERIC_ERROR = "Something went wrong. Please try again.";
const NETWORK_ERROR =
  "Could not reach the server. Check your connection and try again.";

type PendingAction = "toggle" | "delete";

/** Read the server's safe error message, falling back to a generic one. */
async function readError(response: Response): Promise<string> {
  if (response.status >= 500) return GENERIC_ERROR;
  try {
    const data = (await response.json()) as { error?: unknown };
    if (typeof data.error === "string" && data.error) return data.error;
  } catch {
    // ignore unreadable bodies
  }
  return GENERIC_ERROR;
}

export default function Checklist() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<Record<string, PendingAction>>({});
  const [notice, setNotice] = useState<string | null>(null);

  // Refs let the background refresh know whether a change is in flight,
  // so a stale list from the server never overwrites the user's change.
  const inFlight = useRef(0);
  const version = useRef(0);
  const addingRef = useRef(false);
  const loadingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const beginMutation = () => {
    inFlight.current += 1;
    version.current += 1;
  };
  const endMutation = () => {
    inFlight.current -= 1;
    version.current += 1;
  };

  const setPendingFor = (id: string, action: PendingAction | null) =>
    setPending((prev) => {
      const next = { ...prev };
      if (action) next[id] = action;
      else delete next[id];
      return next;
    });

  const loadTasks = useCallback(async (background: boolean) => {
    if (loadingRef.current) return;
    if (background && inFlight.current > 0) return;
    loadingRef.current = true;
    const startVersion = version.current;
    if (!background) setLoadError(null);
    try {
      const response = await fetch("/api/tasks", { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { tasks: Task[] };
      // Discard the result if the user changed something meanwhile.
      if (version.current === startVersion && inFlight.current === 0) {
        setTasks(data.tasks);
        setLoadError(null);
      }
    } catch {
      if (!background) {
        setLoadError("We couldn't load the checklist. Please try again.");
      }
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void loadTasks(false);

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void loadTasks(true);
    };
    const timer = window.setInterval(refreshIfVisible, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
    };
  }, [loadTasks]);

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (addingRef.current) return;

    const result = validateTitle(title);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    addingRef.current = true;
    setAdding(true);
    setFormError(null);
    beginMutation();
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: result.title }),
      });
      if (!response.ok) {
        setFormError(await readError(response));
        return;
      }
      const data = (await response.json()) as { task: Task };
      setTasks((prev) => [
        data.task,
        ...(prev ?? []).filter((t) => t.id !== data.task.id),
      ]);
      setTitle("");
    } catch {
      setFormError(NETWORK_ERROR);
    } finally {
      endMutation();
      addingRef.current = false;
      setAdding(false);
      // The input was disabled while saving; return focus for the next task.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  async function handleToggle(task: Task) {
    if (pending[task.id]) return;
    const nextCompleted = !task.completed;

    setNotice(null);
    setPendingFor(task.id, "toggle");
    beginMutation();
    // Show the change straight away; it is rolled back if saving fails.
    setTasks((prev) =>
      (prev ?? []).map((t) =>
        t.id === task.id ? { ...t, completed: nextCompleted } : t,
      ),
    );

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nextCompleted }),
      });
      if (response.ok) {
        const data = (await response.json()) as { task: Task };
        setTasks((prev) =>
          (prev ?? []).map((t) => (t.id === task.id ? data.task : t)),
        );
      } else if (response.status === 404) {
        setTasks((prev) => (prev ?? []).filter((t) => t.id !== task.id));
        setNotice(await readError(response));
      } else {
        rollbackToggle(task);
        setNotice(`Couldn't update “${task.title}”. ${await readError(response)}`);
      }
    } catch {
      rollbackToggle(task);
      setNotice(`Couldn't update “${task.title}”. ${NETWORK_ERROR}`);
    } finally {
      endMutation();
      setPendingFor(task.id, null);
    }
  }

  function rollbackToggle(task: Task) {
    setTasks((prev) =>
      (prev ?? []).map((t) =>
        t.id === task.id ? { ...t, completed: task.completed } : t,
      ),
    );
  }

  async function handleDelete(task: Task) {
    if (pending[task.id]) return;
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) {
      return;
    }

    setNotice(null);
    setPendingFor(task.id, "delete");
    beginMutation();
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}`, {
        method: "DELETE",
      });
      if (response.ok || response.status === 404) {
        setTasks((prev) => (prev ?? []).filter((t) => t.id !== task.id));
      } else {
        setNotice(`Couldn't delete “${task.title}”. ${await readError(response)}`);
      }
    } catch {
      setNotice(`Couldn't delete “${task.title}”. ${NETWORK_ERROR}`);
    } finally {
      endMutation();
      setPendingFor(task.id, null);
    }
  }

  const total = tasks?.length ?? 0;
  const completedCount = tasks?.filter((t) => t.completed).length ?? 0;
  const percent = total === 0 ? 0 : Math.round((completedCount / total) * 100);
  const trimmedLength = title.trim().length;

  return (
    <div className="space-y-6">
      {/* Add task */}
      <section className="rounded-2xl bg-white p-5 shadow-lg shadow-navy-900/10 ring-1 ring-slate-200 sm:p-6">
        <form onSubmit={handleAdd} noValidate>
          <label
            htmlFor="new-task"
            className="block text-sm font-semibold text-navy-900"
          >
            New study task
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              ref={inputRef}
              id="new-task"
              name="title"
              type="text"
              autoComplete="off"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="For example: Review beneficial ownership requirements"
              aria-invalid={formError ? true : undefined}
              aria-describedby={formError ? "new-task-error" : "new-task-hint"}
              disabled={adding}
              className="min-h-12 w-full min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-500 focus:border-teal-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/30 disabled:bg-slate-100 aria-[invalid=true]:border-red-600"
            />
            <button
              type="submit"
              disabled={adding}
              className="min-h-12 shrink-0 rounded-lg bg-teal-700 px-5 text-base font-semibold text-white transition-colors hover:bg-teal-600 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-navy-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {adding ? "Adding…" : "Add task"}
            </button>
          </div>
          {formError ? (
            <p
              id="new-task-error"
              role="alert"
              className="mt-2 text-sm font-medium text-red-700"
            >
              {formError}
            </p>
          ) : (
            <p id="new-task-hint" className="mt-2 text-sm text-slate-600">
              Up to {TITLE_MAX_LENGTH} characters.
              {trimmedLength > TITLE_MAX_LENGTH - 40 && (
                <span
                  className={
                    trimmedLength > TITLE_MAX_LENGTH
                      ? " font-medium text-red-700"
                      : ""
                  }
                >
                  {" "}
                  {trimmedLength}/{TITLE_MAX_LENGTH}
                </span>
              )}
            </p>
          )}
        </form>
      </section>

      {/* Progress and list */}
      <section
        aria-labelledby="tasks-heading"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
      >
        <h2 id="tasks-heading" className="sr-only">
          Study tasks
        </h2>

        {tasks === null ? (
          loadError ? (
            <div role="alert" className="py-6 text-center">
              <p className="text-base text-red-700">{loadError}</p>
              <button
                type="button"
                onClick={() => void loadTasks(false)}
                className="mt-4 min-h-11 rounded-lg border border-navy-800 px-4 font-semibold text-navy-900 hover:bg-slate-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
              >
                Try again
              </button>
            </div>
          ) : (
            <div role="status" aria-live="polite" className="space-y-3 py-2">
              <span className="sr-only">Loading tasks…</span>
              <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
              <div className="h-2 w-full animate-pulse rounded-full bg-slate-200" />
              <div className="h-12 w-full animate-pulse rounded-lg bg-slate-100" />
              <div className="h-12 w-full animate-pulse rounded-lg bg-slate-100" />
              <p aria-hidden="true" className="text-sm text-slate-600">
                Loading tasks…
              </p>
            </div>
          )
        ) : (
          <>
            <div>
              <p
                className="text-sm font-semibold text-navy-900"
                aria-live="polite"
              >
                {completedCount} of {total} {total === 1 ? "task" : "tasks"}{" "}
                completed
              </p>
              <div
                role="progressbar"
                aria-label="Checklist progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-valuetext={`${percent}% complete`}
                className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
              >
                <div
                  className="h-full rounded-full bg-teal-500 transition-[width] duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            {notice && (
              <div
                role="alert"
                className="mt-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                <p className="min-w-0 break-words [overflow-wrap:anywhere]">
                  {notice}
                </p>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="-my-1 shrink-0 rounded px-2 py-1 font-semibold underline focus-visible:outline-2 focus-visible:outline-red-800"
                >
                  Dismiss
                </button>
              </div>
            )}

            {tasks.length === 0 ? (
              <p className="mt-6 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-base text-slate-600">
                Your checklist is empty. Add your first study task.
              </p>
            ) : (
              <ul className="mt-5 divide-y divide-slate-200 border-t border-slate-200">
                {tasks.map((task) => {
                  const action = pending[task.id];
                  const checkboxId = `task-${task.id}`;
                  return (
                    <li
                      key={task.id}
                      className={`flex items-start gap-2 py-2 ${action === "delete" ? "opacity-60" : ""}`}
                    >
                      <label
                        htmlFor={checkboxId}
                        className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-lg px-1 py-2.5"
                      >
                        <input
                          id={checkboxId}
                          type="checkbox"
                          checked={task.completed}
                          disabled={Boolean(action)}
                          onChange={() => void handleToggle(task)}
                          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-teal-700 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-wait"
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-base break-words [overflow-wrap:anywhere] ${
                              task.completed
                                ? "text-slate-500 line-through"
                                : "text-slate-900"
                            }`}
                          >
                            {task.title}
                          </span>
                          {action && (
                            <span
                              role="status"
                              className="mt-0.5 block text-xs font-medium text-teal-700"
                            >
                              {action === "toggle" ? "Saving…" : "Deleting…"}
                            </span>
                          )}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => void handleDelete(task)}
                        disabled={Boolean(action)}
                        aria-label={`Delete task: ${task.title}`}
                        title="Delete task"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
