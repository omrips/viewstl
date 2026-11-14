# Preview-site animation integration plan

> Historical first-integration plan. Since rc.9, website controls live in the
> separate website project; plugin/session APIs own the model operations.

Status: implemented, 2026-11-02. This document records the approved scope.
The controller, static site controls and tests are implemented; deployment
evidence is recorded in the site's infrastructure/SERVER.md.

## First site release

Add a collapsed **Animation** section to the selected model's editing panel,
alongside the existing Move & rotate controls. Keep it absent from the empty
viewer and disabled until the selected model has finished opening. First expose
only spinning: X/Y/Z axis, seconds per revolution, direction, Play/Pause/Resume
and Stop. Keep movement/scaling choreography in the API initially.

Play calls `animate_model(id, {delta: {rotationz: 2*Math.PI, msec: 5000,
loop: true}})` with the chosen axis, duration and sign. Pause and Resume use
the new methods; Stop calls `animate_model(id, null)` and retains the pose.
Changing settings restarts the spin from the current pose. Selection changes
change the displayed controls, not other models' playback.

## Plugin owns behavior

Implement optional UI binding in `src/app-animation.js`, wired through
`mountViewstlApp`. The website supplies only markup, labels and styling; its
small `site/app.js` remains configuration. Use `animation_state_callback`
to update controls on transitions, with normal callback composition so host
callbacks remain usable. Read `get_model_animation_state` when selection changes.

Synchronize the app controller's cached model position/rotation/scale from
`get_model_info` when playback pauses, stops or completes, before manual tools
compute their next transform. This prevents a drag from starting at stale
coordinates. If live numeric readouts are visible, refresh only those readouts
at a modest rate; never rebuild model lists, geometry or GPU buffers per frame.

The plugin stops a model's animation on manual position, rotation, scale or unit
edits. The controller should also stop it when entering a manual transform tool,
before capturing the tool's starting pose. Reset pose must stop playback first.
Color, viewing-mode, section, grid and camera operations can remain usable.

## Scenes, export and checks

VSB/VSJ saves preserve playback definitions, phase, pivot and paused/running state.
Show restored playback state in the selected-model controls. New scene imports
start their models together after successful loading. For users requesting
reduced motion, pause restored animation in the controller's restoration callback
before the next render; offer explicit Play. New ordinary files never auto-spin.

PNG and regular model exports capture the current pose. Add a short hint in Save:
“VSB/VSJ also preserve animation.” Do not imply STL/OBJ/3MF/STEP/IGES files contain
playback or that PNG export creates a video.

When the user starts print checks, pause the affected animated models so the
analysis describes a stable pose. Keep the check panel open, following its
existing explicit-close behavior. Offer Resume afterward; resuming motion marks
the report stale and clears inappropriate highlights, without dismissing the
panel. Do not silently resume while displaying a supposedly current result.

## Accessibility and verification

Use native labeled controls and sufficiently large touch targets. Keep playback
off by default, announce state transitions rather than frames, preserve keyboard
focus, and avoid new global shortcuts that conflict with camera/transform tools.
Respect `prefers-reduced-motion` for imported automatic playback.

Verify mouse, keyboard and narrow layouts; test actual touch hardware separately
from viewport emulation. Cover selection changes, simultaneous animations, edits,
scene reopening, failed imports, reset, model removal, errors, PNG/model saving,
and a check panel that remains open. Compare frame intervals and geometry/GPU
resource counts against the plugin's million-triangle baseline.

## Rollout

1. Implement and validate the optional plugin app-controller binding locally.
2. Add the small site control section and exercise the complete local flow.
3. Sync the complete tested plugin distribution and deploy to preview only.
4. Check the deployed import/export paths, state controls and idle behavior.

Keep legacy production unchanged. Timelines, keyframes, easing and video/GIF
export are separate later features.
