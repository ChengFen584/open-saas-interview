import { action, page, query, route, type Spec } from "@wasp.sh/spec";

import { HtmlAnimationPage } from "./HtmlAnimationPage" with { type: "ref" };
import {
  generateHtmlAnimation,
  getHtmlAnimation,
  listHtmlAnimations,
} from "./operations" with { type: "ref" };

export const htmlAnimationSpec: Spec = [
  route(
    "HtmlAnimationRoute",
    "/animation-studio",
    page(HtmlAnimationPage, { authRequired: true }),
  ),
  query(listHtmlAnimations, { entities: ["HtmlAnimation"] }),
  query(getHtmlAnimation, { entities: ["HtmlAnimation"] }),
  action(generateHtmlAnimation, { entities: ["HtmlAnimation"] }),
];
