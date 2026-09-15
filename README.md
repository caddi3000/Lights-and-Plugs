# Auto Floorplan Controls

## v0.2.0 — Minimal Controls

A deliberately minimal Home Assistant floorplan card for **lights, plugs and switches**.

### Design
- The supplied floorplan remains the main interface.
- No power, energy, climate, solar or EV measurements are shown.
- A subtle green room indicator means at least one control in that room is ON.
- Tap a room label to open its compact controls.
- Tap ON/OFF to control an entity.
- Tap an entity name/icon for Home Assistant More Info.
- **All off** is available per room.
- Dimmable lights get a simple **1–100% brightness slider**.
- Non-dimmable lights do not show a brightness control.
- Home Assistant Areas are the source of truth, so entity/device area changes are reflected by the card after registry/card refresh.

### Install manually
Copy:
- `dist/auto-floorplan-controls.js` → `/config/www/auto-floorplan-controls/auto-floorplan-controls.js`
- `assets/floorplan.png` → `/config/www/auto-floorplan-controls/floorplan.png`

Add Dashboard Resource:
`/local/auto-floorplan-controls/auto-floorplan-controls.js`
as a **JavaScript Module**.

Then add:

```yaml
type: custom:auto-floorplan-controls
title: Home Controls
image: /local/auto-floorplan-controls/floorplan.png
domains:
  - light
  - switch
```

### Area aliases
Default zones cover Kids, Nursery, Master, Open Plan, Laundry, Bathroom, Porch, Shed and Garage. If your HA Area names differ, the `zones` option can override aliases and floorplan positions.
