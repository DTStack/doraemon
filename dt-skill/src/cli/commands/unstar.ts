import { apiRequest } from "../../http.js";
import { ApiRoutes, ApiV1UnstarResponseSchema } from "../../schema/index.js";
import { getRegistry } from "../registry.js";
import type { GlobalOpts } from "../types.js";
import { createSpinner, fail, formatError, isInteractive, promptConfirm } from "../ui.js";

export async function cmdUnstarSkill(
  opts: GlobalOpts,
  slugArg: string,
  options: { yes?: boolean },
  inputAllowed: boolean,
) {
  const slug = slugArg.trim().toLowerCase();
  if (!slug) fail("Slug required");
  const allowPrompt = isInteractive() && inputAllowed !== false;

  if (!options.yes) {
    if (!allowPrompt) fail("Pass --yes (no input)");
    const ok = await promptConfirm(`Unstar ${slug}?`);
    if (!ok) return undefined;
  }

  const registry = await getRegistry(opts, { cache: true });
  const spinner = createSpinner(`Unstarring ${slug}`);
  try {
    const result = await apiRequest(
      registry,
      { method: "DELETE", path: `${ApiRoutes.stars}/${encodeURIComponent(slug)}` },
      ApiV1UnstarResponseSchema,
    );
    spinner.succeed(
      result.alreadyUnstarred ? `OK. ${slug} already unstarred.` : `OK. Unstarred ${slug}`,
    );
    return result;
  } catch (error) {
    spinner.fail(formatError(error));
    throw error;
  }
}
