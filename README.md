# Sambesi Light Card

**Sambesi Light Card** is a universal Home Assistant Lovelace custom card for lights, rooms and scenes.

Version: **v0.1.0**

It is not tied to Casambi. It works with normal Home Assistant `light.*` entities, for example Hue, Zigbee2MQTT, ZHA, Shelly, ESPHome, WLED, MQTT, KNX, Homematic, Matter and Casambi lights.

## Features in v0.1.0

- Auto discovery of `light.*` entities
- Optional manual light list
- Room/area grouping using Home Assistant registry data
- Search field
- Area tabs
- On/off control
- Brightness slider
- Quick brightness buttons: 10, 25, 50, 75 and 100 percent
- Automatic color temperature control when supported by the entity
- Automatic RGB preset buttons when supported by the entity
- Scene discovery related to visible areas
- Status counters for total lights, lights on and unavailable lights
- Layouts: wall, list and compact
- Presets: djungle, neon, lcars and minimal
- Visual editor support
- HACS-ready file layout

## Installation

Copy this file into Home Assistant:

```text
config/www/community/sambesi-light-card/sambesi-light-card.js
```

Then add this Lovelace resource:

```yaml
url: /local/community/sambesi-light-card/sambesi-light-card.js
type: module
```

If installed through HACS, the resource is usually handled automatically.

## Minimal YAML

```yaml
type: custom:sambesi-light-card
title: Sambesi Lights
preset: djungle
layout: wall
auto_discover: true
group_by: area
```

## Full Example

```yaml
type: custom:sambesi-light-card
title: Hausbeleuchtung
preset: djungle
layout: wall
auto_discover: true
group_by: area
sort_by: area_name
show_header: true
show_stats: true
show_search: true
show_area_tabs: true
show_scenes: true
show_footer: true
controls:
  power: true
  brightness: true
  quick_brightness: true
  color_temp: auto
  rgb: auto
  scenes: true
quick_brightness_values:
  - 10
  - 25
  - 50
  - 75
  - 100
```

## Presets

```yaml
preset: djungle
```

```yaml
preset: neon
```

```yaml
preset: lcars
```

```yaml
preset: minimal
```

## Layouts

```yaml
layout: wall
```

```yaml
layout: list
```

```yaml
layout: compact
```

## Manual Entities

```yaml
type: custom:sambesi-light-card
title: Manuelle Lampen
preset: neon
auto_discover: false
lights:
  - light.wohnzimmer_decke
  - light.stehlampe
  - light.kueche
```

## Include / Exclude

```yaml
type: custom:sambesi-light-card
auto_discover: true
exclude_entities:
  - light.testlampe
exclude_areas:
  - Keller
```

## Notes

v0.1.0 is the first full feature prototype. It intentionally avoids integration-specific assumptions and only relies on Home Assistant states and registry metadata exposed to Lovelace.
