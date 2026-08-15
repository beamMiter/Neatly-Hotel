import { Noto_Serif_Display, Inter, Open_Sans } from "next/font/google";

// Shared across auth pages (login, agent login, ...) — defined once so
// next/font dedupes the generated font files instead of every page
// requesting its own copy.
//
// Headline uses the "Display" cut (not plain Noto Serif) — per design it's
// Noto Serif Display, SemiCondensed, Medium. SemiCondensed = font-stretch
// 87.5%, which only the variable-font build exposes (static cuts are
// fixed at 100% width), so weight is set to "variable" and the actual
// weight/width are applied via classes: `font-medium [font-stretch:87.5%]`.
export const notoSerifDisplay = Noto_Serif_Display({ subsets: ["latin"], weight: "variable" });
export const inter = Inter({ subsets: ["latin"], weight: ["400", "600"] });
export const openSans = Open_Sans({ subsets: ["latin"], weight: ["400", "600"] });
