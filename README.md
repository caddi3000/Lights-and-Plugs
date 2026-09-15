# Lights and Plugs v0.2.2

Minimal HACS Lovelace floorplan card.

## v0.2.2
- Floorplan is embedded directly inside the JavaScript module, eliminating the HACS secondary-image loading problem.
- The former Open Plan zone is split into **Lounge**, **Dining**, and **Kitchen**.
- Each new zone uses its matching Home Assistant Area (`Lounge`/`Living Room`, `Dining`/`Dining Room`, `Kitchen`).
- No power measurements.
- Dimmable lights retain brightness sliders.
- Automatic HA Area discovery remains.

Card YAML:
```yaml
type: custom:auto-floorplan-controls
title: Lights & Plugs
```

Upload the contents of this ZIP directly to the repository root, then re-download/update in HACS and hard-refresh the browser.
