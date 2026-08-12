# Sambesi Light Card v0.1.8

Hotfix: The preview limit now applies only to the Home Assistant **Add card / Nach Karte** picker stub preview, not to the normal card editor preview.

## Changes

- Adds internal `_picker_preview` flag for the Add-card picker preview.
- `getStubConfig()` now returns `_picker_preview: true` and `preview_limit: 2`.
- The visual editor removes `_picker_preview` immediately, so the editor preview can show the normal configurable card.
- Default picker preview limit reduced from 3 to 2.
- Keeps v0.1.7 entity suggestions for `light.*` entities.

## Result

- **Nach Karte** preview remains small and performant.
- **Karte anpassen** editor preview is no longer artificially limited.
