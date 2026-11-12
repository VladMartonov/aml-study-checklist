export const TITLE_MAX_LENGTH = 200;

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
};

export type TitleValidation =
  | { ok: true; title: string }
  | { ok: false; error: string };

/** Shared by the browser form and the API so both apply identical rules. */
export function validateTitle(input: unknown): TitleValidation {
  if (typeof input !== "string") {
    return { ok: false, error: "Please enter a task title." };
  }
  const title = input.trim();
  if (title.length === 0) {
    return { ok: false, error: "Please enter a task title." };
  }
  if (title.length > TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Task titles can be at most ${TITLE_MAX_LENGTH} characters.`,
    };
  }
  return { ok: true, title };
}
