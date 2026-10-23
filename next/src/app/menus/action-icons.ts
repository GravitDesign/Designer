// Old: designer.browser.dev.js module 844 (the action icon table).
/**
 * Icons by action id that the actions' getIcon looks up: icon font class
 * names, and inline SVGs for the align actions (as before, a menu item
 * puts such a string on its `<i>` as class names; see menu-item.ts).
 */
import { Editor } from "../../editor/editor.ts";

const Align = Editor.ArrangeAlignType;
const Order = Editor.ArrangeOrderType;

export const ACTION_ICONS: Readonly<Record<string, string>> = {
  "gravit-cloud": "gravit-icon-cloud",
  "modify.merge": "gravit-icon-merge-union",
  "view.play": "gravit-icon-presentation",
  "edit.paste.in-place": "gravit-icon-paste-in-place",
  "file.install-to-desktop": "gravit-icon-install",
  ["arrange.align." + Align.AlignLeft]:
    '<svg class="align-svg" xmlns="http://www.w3.org/2000/svg" style="isolation:isolate" viewBox="53 2 20 20" width="20" height="20"><rect id="align-area" x="62" y="9" width="4" height="12" transform="rotate(-90 64 15)" fill="#FFF"/><rect id="align-area" x="60" y="5" width="4" height="8" transform="rotate(-90 62 9)" fill="#FFF"/><rect id="align-shape" x="54" y="3" width="2" height="18" transform="rotate(-180 55 12)" fill="#3A98FF"/></svg>',
  ["arrange.align." + Align.AlignCenter]:
    '<svg class="align-svg" xmlns="http://www.w3.org/2000/svg" style="isolation:isolate" viewBox="77 2 20 20" width="20" height="20"><rect id="align-shape" x="86" y="3" width="2" height="18" transform="rotate(180 87 12)" fill="#3A98FF"/><rect id="align-area" x="85" y="3" width="4" height="12" transform="rotate(90 87 9)" fill="#FFF"/><rect id="align-area" x="85" y="11" width="4" height="8" transform="rotate(90 87 15)" fill="#FFF"/></svg>',
  ["arrange.align." + Align.AlignRight]:
    '<svg class="align-svg" xmlns="http://www.w3.org/2000/svg" style="isolation:isolate" viewBox="103 2 20 20" width="20" height="20"><rect id="align-area" x="110" y="9" width="4" height="12" transform="rotate(90 112 15)" fill="#FFF"/><rect id="align-area" x="112" y="5" width="4" height="8" transform="rotate(90 114 9)" fill="#FFF"/><rect id="align-shape" x="120" y="3" width="2" height="18" transform="rotate(180 121 12)" fill="#3A98FF"/></svg>',
  ["arrange.align." + Align.AlignTop]:
    '<svg class="align-svg" xmlns="http://www.w3.org/2000/svg" style="isolation:isolate" viewBox="128 2 20 20" width="20" height="20"><rect id="align-area" x="133" y="7" width="4" height="12" fill="#FFF"/><rect id="align-area" x="139" y="7" width="4" height="8" fill="#FFF"/><rect id="align-shape" x="137" y="-5" width="2" height="18" transform="rotate(-90 138 4)" fill="#3A98FF"/></svg>',
  ["arrange.align." + Align.AlignMiddle]:
    '<svg class="align-svg" xmlns="http://www.w3.org/2000/svg" style="isolation:isolate" viewBox="156 1.9999999999999982 20 20" width="20" height="20"><rect id="align-shape" x="165" y="3" width="2" height="18" transform="rotate(90 166 12)" fill="#3A98FF"/><rect id="align-area" x="161" y="6" width="4" height="12" transform="rotate(-180 163 12)" fill="#FFF"/><rect id="align-area" x="167" y="8" width="4" height="8" transform="rotate(-180 169 12)" fill="#FFF"/></svg>',
  ["arrange.align." + Align.AlignBottom]:
    '<svg class="align-svg" xmlns="http://www.w3.org/2000/svg" style="isolation:isolate" viewBox="181 2 20 20" width="20" height="20"><rect id="align-area" x="186" y="5" width="4" height="12" transform="rotate(180 188 11)" fill="#FFF"/><rect id="align-area" x="192" y="9" width="4" height="8" transform="rotate(180 194 13)" fill="#FFF"/><rect id="align-shape" x="190" y="11" width="2" height="18" transform="rotate(-90 191 20)" fill="#3A98FF"/></svg>',
  ["arrange.order." + Order.BringForward]: "gravit-icon-bring-front",
  ["arrange.order." + Order.SendBackward]: "gravit-icon-bring-back",
  ["arrange.order." + Order.SendToFront]: "gravit-icon-send-to-front",
  ["arrange.order." + Order.SendToBack]: "gravit-icon-send-to-back",
};
