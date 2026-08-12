# Sambesi Light Card v0.1.7

Improves Home Assistant entity-picker suggestions.

## Changes

- `Einzellicht` suggestion now creates a real one-light card with `entities: [selected light]`.
- `Bereich/Universal` suggestion now creates an area/universal card using `area_filter` if Home Assistant exposes an area/room attribute.
- `area_filter` is now supported in the card logic.
- Keeps the v0.1.5/v0.1.6 card-picker preview limit.

## Einzellicht suggestion

```yaml
type: custom:sambesi-light-card
title: MiniController Casambi Dim2Warm
entities:
  - light.minicontroller_casambi_tw
max_lights: 1
show_search: false
show_area_chips: false
```

## Bereich/Universal suggestion

```yaml
type: custom:sambesi-light-card
title: Sambesi Lights - <area>
area_filter: <area>
max_lights: 4
show_search: true
show_area_chips: true
```
