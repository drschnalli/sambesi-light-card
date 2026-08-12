# Sambesi Light Card v0.1.6

Adds Home Assistant entity-picker suggestions for light entities.

## Changes

- The card now appears under **Nach Entität** for `light.*` entities in Home Assistant 2026.6+.
- Adds `getEntitySuggestion()` to `window.customCards`.
- Keeps the v0.1.5 preview limit performance fix.
- Suggestions create a one-light Sambesi card, so the picker preview remains compact.

## Example suggestion config

```yaml
type: custom:sambesi-light-card
title: MiniController Casambi Dim2Warm
entities:
  - light.minicontroller_casambi_tw
compact_preview: false
preview_limit: 1
max_lights: 1
show_search: false
show_area_chips: false
```
