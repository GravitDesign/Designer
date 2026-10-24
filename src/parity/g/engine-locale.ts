import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { LocaleLanguage } from "../../engine/core/locale/locale-language.ts";
import { Translation } from "../../engine/core/locale/translation-loader.ts";
import { TranslationEvents } from "../../engine/core/locale/translation-events.ts";
import { TranslationNotificationEvent } from "../../engine/core/locale/translation-notification-event.ts";

export const engineLocale = {
  GLocale: Locale,
  GLocaleKey: LocaleKey,
  GLocaleLanguage: LocaleLanguage,
  GTranslation: Translation,
  GTranslationNotificationEvent: TranslationNotificationEvent,
  GTranslationEvents: TranslationEvents,
};
