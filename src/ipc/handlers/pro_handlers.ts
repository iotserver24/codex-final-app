import log from "electron-log";
import { createLoggedHandler } from "./safe_handle";

import { UserBudgetInfo, UserBudgetInfoSchema } from "../ipc_types";
import { IS_TEST_BUILD } from "../utils/test_utils";

const logger = log.scope("pro_handlers");
const handle = createLoggedHandler(logger);

export function registerProHandlers() {
  // Client-side only CodeX Pro - no server dependencies
  handle("get-user-budget", async (): Promise<UserBudgetInfo | null> => {
    if (IS_TEST_BUILD) {
      return null;
    }

    logger.info("CodeX Pro is now client-side only - no budget limits");

    // Return unlimited budget for client-side CodeX Pro
    return UserBudgetInfoSchema.parse({
      usedCredits: 0, // No credits used since it's client-side
      totalCredits: Number.MAX_SAFE_INTEGER, // Unlimited credits
      budgetResetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    });
  });
}
