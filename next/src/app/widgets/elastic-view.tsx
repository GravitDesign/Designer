/**
 * `<ElasticTextarea>`: a textarea with the growing behaviour of elastic.ts,
 * attached once it is in the document (the twin goes into its parent).
 */
import { useLayoutEffect, useRef, type ReactNode, type TextareaHTMLAttributes } from "react";
import { attachElastic } from "./elastic.ts";

export function ElasticTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>): ReactNode {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => (ref.current ? attachElastic(ref.current) : undefined), []);
  return <textarea {...props} ref={ref} />;
}
