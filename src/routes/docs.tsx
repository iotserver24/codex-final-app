import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import DocsPage from "../pages/docs";

export const docsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docs",
  component: DocsPage,
});
