// Old: designer.browser.dev.js module 1666 (GNotificationPanel).
/**
 * The footer panel that shows the designer's notifications
 * (Designer.addNotification): a close button and the last message.
 * Notifications tied to a document hide while another document is active
 * and close with it. A "custom" notification brings its own content and
 * classes and can time out with an exit animation.
 *
 * The anonymous sign-up promo (notification.anonymous) belonged to the
 * dropped cloud account; nothing sets that flag any more, so its markup
 * is left out and such a notification shows like a plain one.
 */
import { createElement } from "react";
import { registerClass } from "../../engine/core/object.ts";
import { DocumentEvent } from "../document/document-event.ts";
import { Panel } from "../inspector/panel.ts";
import { designer } from "../shell/globals.ts";
import { View } from "../shell/view.ts";
import { renderInto, type Island } from "../state/islands.tsx";
import { NotificationBuilder } from "./notification.ts";
import type { NotificationData } from "./notification-event.ts";
import { NotificationEvent } from "./notification-event.ts";
import { NotificationPanelView, type NotificationContent } from "./notification-panel-view.tsx";

interface PanelDocument {
  isLockedByVersionHistory(): boolean;
}

export class NotificationPanel extends Panel {
  static {
    registerClass(this, "GNotificationPanel");
  }

  static readonly ID = "notification-panel";

  private _htmlElement: HTMLElement | null = null;
  private _lastNotification: NotificationData | null = null;
  private _closeCallback: (() => void) | null | undefined = null;
  private _island: Island | null = null;
  private _content: NotificationContent | null = null;
  private _serial = 0;

  override init(htmlElement: HTMLElement): void {
    this._htmlElement = htmlElement;
    htmlElement.classList.add("g-hide");
    htmlElement.classList.add("g-notification-panel");
    htmlElement.addEventListener("click", () => {
      htmlElement.classList.toggle("bring-to-front", true);
      designer().sendSideBarAndAssistBarToBack();
    });
    this._island = renderInto(htmlElement, this._view());
    designer().addEventListener(NotificationEvent, this._notificationEvent, this);
    designer().addEventListener(DocumentEvent, this._documentEvent, this);
  }

  private _view() {
    return createElement(NotificationPanelView, {
      onClose: () => this._close(true),
      content: this._content,
    });
  }

  private _element(): HTMLElement {
    return this._htmlElement as HTMLElement;
  }

  override isEnabled(): boolean {
    return !this._element().classList.contains("g-hide");
  }

  private _documentEvent(event: DocumentEvent): void {
    const document = event.document as PanelDocument;
    if (
      !document.isLockedByVersionHistory() &&
      this._lastNotification &&
      this._lastNotification.document
    )
      switch (event.type) {
        case DocumentEvent.Type.Activated: {
          const other = event.document !== this._lastNotification.document;
          this._element().classList.toggle("g-hide", other);
          this._element().classList.toggle("bring-to-front", other);
          if (other) designer().sendSideBarAndAssistBarToBack();
          break;
        }
        case DocumentEvent.Type.Removed:
          if (event.document === this._lastNotification.document) this._close();
      }
  }

  private async _notificationEvent(event: NotificationEvent): Promise<void> {
    const notification = event.notification;
    const element = this._element();
    this._lastNotification = notification;
    this._closeCallback = notification.closeCallback;
    element.classList.remove("g-hide");
    element.classList.toggle("bring-to-front", true);
    designer().sendSideBarAndAssistBarToBack();
    element.classList.toggle("popup", !!notification.popup && !notification.anonymous);
    if (notification.custom) {
      this._closeCallback = notification.closeCallback;
      for (const name of [notification.class, notification.enter])
        if (name) element.classList.add(...name.split(/\s+/).filter(Boolean));
      this._updateContent(notification.content, false);
      if (notification.timeout) {
        new Promise((resolve) => {
          setTimeout(() => {
            if (notification.enter) element.classList.remove(notification.enter);
            if (notification.exit) element.classList.add(notification.exit);
            resolve(true);
          }, notification.timeout);
        }).then(() => {
          setTimeout(() => {
            if (notification.exit) element.classList.remove(notification.exit);
            this._close(false);
          }, 600);
        });
      }
    } else if (event.builder instanceof NotificationBuilder) {
      event.builder.addEventListener(NotificationBuilder.Event, (closeEvent) => {
        if (closeEvent.type === NotificationBuilder.Event.Type.Close) this._close();
      });
      this._updateContent(await event.builder.build(), true);
    } else this._updateContent(notification.message, true);
    this.trigger(View.UPDATE_EVENT);
  }

  private _updateContent(content: NotificationContent["content"], wrap: boolean): void {
    this._content = { wrap, content, serial: ++this._serial };
    if (this._island) this._island.render(this._view());
  }

  private _close(byUser?: boolean): void {
    this._lastNotification = null;
    this._element().classList.add("g-hide");
    if (this._closeCallback && byUser) this._closeCallback();
    this.trigger(View.UPDATE_EVENT);
  }

  override toString(): string {
    return "[Object GNotificationPanel]";
  }

  override getId(): string {
    return NotificationPanel.ID;
  }
}
