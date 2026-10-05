// STAGE dismiss_consent — close the consent banner (decline only, never accept) and
// marketing popups. The read_* scripts already do this themselves; use this one alone
// before a preview screenshot, or as the preview phase's dismiss.js.
return emit(await dismissOverlays());
