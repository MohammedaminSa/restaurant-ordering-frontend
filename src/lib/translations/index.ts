import { en, type TranslationSchema } from "./en";
import { or } from "./or";
import { am } from "./am";

export { en, or, am };
export type { TranslationSchema };

export type DeepKey<T> = {
  [K in keyof T & string]: T[K] extends Record<string, unknown> ? `${K}.${DeepKey<T[K]>}` : K;
}[keyof T & string];

export type TranslationKey = DeepKey<TranslationSchema>;

export const translations: Record<"en" | "or" | "am", TranslationSchema> = { en, or, am };
