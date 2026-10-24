# Draft questions: the editor in the GravitDesign Next look (run RD)

For QUESTIONS.md once numbered. All of them are about the next look only
(CHANGES.md CHG-002); the classic look is unchanged. Each says what was
decided for now.

## Q-RD-1 The mark moves the menu bar captions 30 px to the right

public/brand/editor.css, `#header > .section.menu`. The brief asks for the
mark at the left of the menu bar and for nothing to move. The header had
10 px of left padding, too little for a mark. The mark now sits in that
section's own padding (40 px instead of 10 px): the header keeps its
36 px and every part keeps its place, but File, Edit, Modify, View and
Help start 30 px further right, and their menus open 30 px further right.
Nothing in the parity suite depends on it (it runs the classic look).

Decided for now: keep the mark. The alternative is no mark in the editor
header (the welcome screen and the window icon still carry it).

## Q-RD-2 Document tab titles are 12 px instead of 11 px

Same file, `#header > .section.windows > .tabs > .tab`. The tabs now use
Manrope at 12 px and weight 600, to match the menu bar next to them; the
old titles were Lato 11 px, the only 11 px text in the header. The tab
keeps its height; a tab gets a few pixels wider, so the tab row on the
right grows a little.

Decided for now: 12 px.

## Q-RD-3 Control frames are darker than before

Same file, the field, select, button and checkbox rules. The old frames
(#DFDFDF on white, 1.4:1) don't meet the 3:1 the brief asks for UI
borders. The new frame colour meets 3:1 on every panel colour in both
themes, which makes fields visibly framed. That includes the welcome
screen's size fields, unit select and checkbox, so the welcome recordings
changed too (the rest of the welcome screen is as before).

Decided for now: 3:1 frames everywhere. The other way to meet 3:1 would
be filled fields with a darker underline, which changes the look more.

## Q-RD-4 "On" toggles look like the active tool

Same file, `.action-button.g-active` in the toolbar. The old toolbar used
one grey for the active tool and for toggles that are on (snapping). Both
now get the magenta tint and icon, so with snapping on there are two
magenta buttons in the toolbar.

Decided for now: same style (both mean "on"). The alternative is the
tint for the tool only and a neutral pressed grey for toggles.

## Q-RD-5 Rich tooltips stay black

Same file, `.g-overlay.g-tooltip-content-overlay`. The rich tooltips
(title and text) keep the old black background because their arrow tails
are black SVG files from the old assets; only their radius and shadow
follow the new surface. The simple tooltip uses ink (#1B1B24), which is
close enough that the two read alike.

Decided for now: leave the rich tooltips black. Making them ink means new
tail images or drawing the tails in CSS.

## Q-RD-6 The brand editor scene shows the selection on the canvas

parity/scenarios/brand/brand.spec.ts `editorWithSelection`. The old scene
put the selected card at x 100, mostly under the left sidebar, so the
"editor window with a selection" shot showed only one edge of it. The
shapes now sit at x 420 and 700. The editor-selection, inspector and
layers recordings changed for this as well as for the restyle.

Decided for now: the new positions.
