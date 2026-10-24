/** The content of a rich tooltip (rich-tooltip.ts). */
import { useEffect, useState, type ReactNode } from "react";
import { Key, type KeyValue } from "../../engine/core/key.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";

export interface RichTooltipContentProps {
  title: unknown;
  isPro: unknown;
  shortcut: unknown;
  video: unknown;
  pic: unknown;
  description: unknown;
  videoTimeout: unknown;
  /** The enhanced tooltips setting: off shows the title (and shortcut) only. */
  enhanced: boolean;
  learnMore: unknown;
}

function hasLength(value: unknown): boolean {
  return !!value && !!(value as { length?: number }).length;
}

/** The class list of `.g-tooltip-content-wrapper`: toggleClass("g-pro", isPro). */
export function wrapperClass(isPro: unknown): string {
  // jQuery's toggleClass with a non-boolean state toggled the class on.
  const pro = "boolean" == typeof isPro ? isPro : true;
  return pro ? "g-tooltip-content-wrapper g-pro" : "g-tooltip-content-wrapper";
}

export function RichTooltipContent(props: RichTooltipContentProps): ReactNode {
  const { title, shortcut, video, pic, enhanced, learnMore } = props;
  const link = learnMore
    ? `<a href="${String(learnMore)}" target="_blank">${
        Locale.get(new LocaleKey("GCommonNames", "text.learn-more")) as string
      }</a>`
    : "";
  const description = props.description ? `${String(props.description)} ${link}` : link;
  const [videoShown, setVideoShown] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  useEffect(() => {
    if (!(enhanced && video)) return;
    const timer = setTimeout(() => setVideoShown(true), props.videoTimeout as number);
    return () => clearTimeout(timer);
  }, [enhanced, video, props.videoTimeout]);
  const withShortcut = hasLength(shortcut);
  return (
    <div className={wrapperClass(props.isPro)}>
      <div className={enhanced ? "g-tooltip-content-header" : "g-tooltip-content-header simple"}>
        {withShortcut ? (
          <div className="g-tooltip-content-shortcut">
            {Key.shortcutToString(shortcut as readonly KeyValue[])}
          </div>
        ) : null}
        <div
          className={
            withShortcut ? "limit-width g-tooltip-content-title" : "g-tooltip-content-title"
          }
        >
          {String(title)}
        </div>
      </div>
      {enhanced && description ? (
        // Old: .html(description); descriptions are the app's own strings.
        <div
          className="g-tooltip-content-description"
          dangerouslySetInnerHTML={{ __html: description }}
        />
      ) : null}
      {enhanced && hasLength(video) ? (
        <div
          className={videoLoaded ? "g-tooltip-content-video" : "g-tooltip-content-video loading"}
        >
          {videoShown ? (
            <video
              width={298}
              height={160}
              src={String(video)}
              autoPlay
              loop
              onLoadedData={() => setVideoLoaded(true)}
            />
          ) : null}
        </div>
      ) : null}
      {enhanced && hasLength(pic) ? (
        <div className="g-tooltip-content-picture">
          <img width={298} height={160} src={String(pic)} />
        </div>
      ) : null}
    </div>
  );
}
