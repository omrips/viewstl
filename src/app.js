import { bindAppTools, toolsControls } from "./app-tools.js";
import { memoryPolicy, estimateFile } from "./memory-policy.js";
import { scenePlacement, sceneFloor } from "./scene-layout.js";
import { bindModelMove } from "./model-move.js";
import { dropKind, droppedURLs } from "./drop-source.js";
import { sceneFormat } from "./scene-import.js";
import { bindAppExport, exportControls } from "./app-export.js";
import { bindAppPrint, printControls } from "./app-print.js";
import {
  bindAppAnimation,
  animationControls,
  syncAnimatedRecord,
  centerAnimationPivot,
} from "./app-animation.js";
import {
  enginePosition,
  modelCenter,
  modelRadius,
  depthPosition,
} from "./model-transform.js";
import { StlViewer } from "./viewer.js";

const mountedRoots = new WeakMap();
const requiredControls = [
  "background-color",
  "background-value",
  "cancel-load",
  "clear-scene",
  "close-colors",
  "close-info",
  "close-model",
  "close-scene",
  "close-section",
  "close-view",
  "color-mode-note",
  "colors-button",
  "colors-panel",
  "depth-controls",
  "depth-model-button",
  "dismiss-notice",
  "drop-message",
  "drop-overlay",
  "empty-state",
  "file-heading",
  "file-input",
  "filename",
  "finish-move",
  "fit-button",
  "grid-button",
  "image-button",
  "info-button",
  "info-dimensions",
  "info-panel",
  "info-size",
  "info-triangles",
  "live-status",
  "loading-label",
  "loading-state",
  "memory-budget",
  "model-color",
  "model-color-value",
  "model-controls",
  "model-list",
  "model-tool",
  "move-controls",
  "move-gesture-message",
  "move-mode",
  "move-mode-name",
  "move-model-button",
  "notice",
  "notice-message",
  "open-label",
  "position-details",
  "position-error",
  "position-units",
  "position-x",
  "position-y",
  "position-z",
  "reset-position",
  "reset-rotation",
  "restore-color",
  "rotate-controls",
  "rotate-model-button",
  "rotation-error",
  "rotation-x",
  "rotation-y",
  "rotation-z",
  "sample-button",
  "scene-arrangement",
  "scene-button",
  "scene-count",
  "scene-panel",
  "section-axis",
  "section-button",
  "section-enabled",
  "section-flip",
  "section-panel",
  "section-position",
  "section-value",
  "smooth-shading",
  "unit-note",
  "view-button",
  "view-description",
  "view-label",
  "view-panel",
  "view-status",
  "viewer",
  "workspace",
];

/** Bind the optional ViewSTL app controls to a Document or an isolated HTML root.
 * All scene state and event handlers belong to this instance. Rendering starts on
 * the first file; CAD and archive dependencies remain lazy worker imports.
 */
export function mountViewstlApp(root, options = {}) {
  if (!root?.querySelectorAll)
    throw new TypeError("A Document or HTMLElement root is required");
  if (mountedRoots.has(root))
    throw new Error("ViewSTL app is already mounted on this root");
  const document = root.ownerDocument || root;
  const window = document.defaultView;
  const URL = window.URL;
  const controls = new Map(
    [...root.querySelectorAll("[id]")].map((el) => [el.id, el]),
  );
  const $ = (id) => controls.get((options.id_prefix || "") + id);
  const missing = requiredControls.filter((id) => !$(id));
  if (exportControls.some((id) => $(id)))
    missing.push(...exportControls.filter((id) => !$(id)));
  if (printControls.some((id) => $(id)))
    missing.push(...printControls.filter((id) => !$(id)));
  if (animationControls.some((id) => $(id)))
    missing.push(...animationControls.filter((id) => !$(id)));
  if (toolsControls.some((id) => $(id)))
    missing.push(...toolsControls.filter((id) => !$(id)));
  if (missing.length)
    throw new Error("Missing ViewSTL controls: " + missing.join(", "));
  const abort = new window.AbortController();
  const dropTarget = root === document ? window : root;
  let disposed = false,
    drainPromise = null,
    lastLoadedID = null;
  const assertActive = () => {
    if (disposed) throw new Error("ViewSTL app is disposed");
  };
  const listen = (target, type, handler, options = {}) =>
    target.addEventListener(type, handler, {
      ...options,
      signal: abort.signal,
    });
  const policy = memoryPolicy(window.navigator.deviceMemory);
  const panelNames = ["view", "section", "info", "scene", "colors"];
  const records = new Map(),
    queue = [];
  const palette = [
    "#64a5b2",
    "#dd766b",
    "#edb14c",
    "#7ca984",
    "#927fbc",
    "#5a8ec7",
    "#89949d",
  ];
  let viewerPromise,
    viewer,
    generation = 0,
    appearanceRequest = 0,
    modelID = null,
    nextID = 0,
    loadingID = null;
  let exportUI;
  let printUI;
  let animationUI;
  let toolsUI;
  let sceneImport;
  let draining = false,
    busy = false,
    gridEnabled = false,
    gridHeight = 0,
    gridSpacing = 1,
    moveMode = false,
    selectionMode = false,
    transformTool = "move",
    modelMover,
    dragArrangement,
    background = "transparent";
  const viewNames = {
    flat: "Solid",
    edges: "Solid + edges",
    wireframe: "Wireframe",
    xray: "X-ray",
    mesh: "Mesh overlay",
    studio: "Studio",
    orientation: "Face orientation",
  };
  const modeInputs = [...root.querySelectorAll('[name="view-mode"]')];
  const shortcutButtons = [...root.querySelectorAll("[data-viewstl-shortcut]")];
  if (options.id_prefix)
    modeInputs.forEach(
      (input) => (input.name = options.id_prefix + "view-mode"),
    );
  const sampleURL = options.sample_url;
  const formatNumber = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  });
  function announce(text) {
    if (disposed) return;
    $("live-status").textContent = text;
  }
  function showNotice(text) {
    if (disposed) return;
    $("notice-message").textContent = text;
    $("notice").hidden = false;
  }
  function syncSelection() {
    viewer?.set_selection(
      !busy &&
        records.has(modelID) &&
        (selectionMode || moveMode || !$("scene-panel").hidden)
        ? modelID
        : null,
    );
  }
  function syncShortcuts() {
    for (const button of shortcutButtons) {
      const action = button.dataset.viewstlShortcut;
      button.disabled =
        busy || !records.size || (action === "save" && !exportUI);
      if (action === "select")
        button.setAttribute("aria-pressed", String(selectionMode));
    }
  }
  function setSelectionMode(enabled) {
    selectionMode = !!enabled && !busy && records.size > 0;
    $("workspace").classList.toggle("selecting-model-mode", selectionMode);
    // Selecting and manipulating models share the compact tool box. Merely
    // enabling it must not stop an animation before a manual interaction.
    setMoveMode(selectionMode, "move", true);
    syncShortcuts();
  }
  function editModelAt(event) {
    const hit = viewer.pick_model(event.clientX, event.clientY);
    if (!hit || !records.has(hit.id)) return;
    event.preventDefault();
    selectModel(hit.id);
    closePanels();
    $("scene-panel").hidden = false;
    $("scene-button").setAttribute("aria-expanded", "true");
    $("position-details").open = true;
    syncSelection();
    announce(
      records.get(hit.id).name + " selected. Choose Move, Rotate or Depth.",
    );
  }
  function closePanel(name) {
    $(name + "-panel").hidden = true;
    $(name + "-button").setAttribute("aria-expanded", "false");
    syncSelection();
  }
  function closePanels() {
    panelNames.forEach(closePanel);
  }
  function togglePanel(name) {
    const open = $(name + "-panel").hidden;
    closePanels();
    $(name + "-panel").hidden = !open;
    $(name + "-button").setAttribute("aria-expanded", String(open));
    syncSelection();
    if (open && name === "info") populateInfo();
    if (open && (name === "scene" || name === "view")) toolsUI?.sync();
  }
  function fileSize(size) {
    return size == null
      ? "Sample model"
      : size < 1024 ** 2
        ? `${formatNumber.format(size / 1024)} KiB`
        : size < 1024 ** 3
          ? `${formatNumber.format(size / 1024 ** 2)} MiB`
          : `${formatNumber.format(size / 1024 ** 3)} GiB`;
  }
  function syncColors() {
    const record = records.get(modelID),
      color = /^#[a-f0-9]{6}$/i.test(record?.color) ? record.color : "#ffffff";
    $("model-color").value = color;
    $("model-color-value").textContent =
      record?.color === null ? "File colors" : color.toUpperCase();
    $("restore-color").textContent = record?.embedded
      ? "Restore file colors"
      : "Restore original color";
    root
      .querySelectorAll("[data-model-color]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.modelColor === record?.color),
        ),
      );
    root
      .querySelectorAll("[data-background]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.background === background),
        ),
      );
    $("background-color").value =
      background === "transparent" ? "#fafbfb" : background;
    $("background-value").textContent =
      background === "transparent" ? "Default" : background.toUpperCase();
  }
  function syncControls() {
    syncAnimatedRecord(records.get(modelID), viewer?._models.get(modelID));
    const info =
        modelID === null
          ? null
          : viewer.get_model_info(modelID, { measurements: false }),
      mode = info?.display === "smooth" ? "flat" : info?.display || "flat";
    for (const input of modeInputs) {
      input.checked = input.value === mode;
      input.disabled = busy;
    }
    $("view-label").textContent = toolsUI ? "View" : viewNames[mode];
    $("view-button").title = "View · " + viewNames[mode];
    $("smooth-shading").checked = info?.smooth_shading || false;
    $("smooth-shading").disabled = busy || mode === "wireframe";
    $("view-status").textContent =
      mode === "wireframe"
        ? "Smooth shading is available in surface views."
        : "Shading changes the appearance, not the geometry.";
    const text =
      mode === "orientation" ? "Blue: front faces · Red: back faces" : "";
    $("view-description").textContent = text;
    $("view-description").hidden = !text;
    $("color-mode-note").hidden = mode !== "orientation";
    const section = info?.section;
    $("section-enabled").checked = !!section;
    $("section-axis").value = section?.axis || "z";
    $("section-position").value = (section?.position ?? 0.5) * 100;
    $("section-value").textContent = $("section-position").value + "%";
    $("section-flip").setAttribute(
      "aria-pressed",
      String(section?.flip || false),
    );
    $("section-button").setAttribute("aria-pressed", String(!!section));
    root
      .querySelectorAll("[data-selected-name]")
      .forEach((el) => (el.textContent = records.get(modelID)?.name || ""));
    syncColors();
    syncPosition();
    exportUI?.sync();
    printUI?.sync();
    animationUI?.sync();
    toolsUI?.sync();
    syncShortcuts();
  }
  function populateInfo() {
    if (modelID === null) return;
    const info = viewer.get_model_info(modelID, { measurements: false }),
      record = records.get(modelID),
      factor = viewer.display_units === "inch" ? 25.4 : 1;
    $("info-triangles").textContent = info.triangles.toLocaleString();
    $("info-dimensions").textContent =
      [info.dims.x, info.dims.y, info.dims.z]
        .map((x) => formatNumber.format(x / factor))
        .join(" × ") + (factor === 1 ? " mm" : " in");
    $("info-size").textContent = fileSize(record.size);
    const size = viewer.get_model_size(modelID);
    $("unit-note").textContent = size.editable
      ? "File coordinates interpreted as " +
        (size.file_units === "inch" ? "inches." : "millimetres (assumed).") +
        " Change file units in Models → Size & units."
      : "Explicit file units were converted to millimetres on import.";
    toolsUI?.syncInfo();
  }
  function renderList() {
    $("model-list").replaceChildren(
      ...[...records.values()].map((record) => {
        const row = document.createElement("li"),
          color = document.createElement("button"),
          pick = document.createElement("button"),
          remove = document.createElement("button");
        row.className = "model-row";
        row.classList.toggle("selected", record.id === modelID);
        color.className = "model-swatch";
        color.dataset.colorModel = record.id;
        color.style.backgroundColor = record.color || "#b7c5c9";
        color.setAttribute("aria-label", "Color for " + record.name);
        color.title = "Change color";
        pick.className = "model-pick";
        pick.dataset.selectModel = record.id;
        pick.textContent = record.name;
        pick.title = record.name;
        pick.setAttribute("aria-pressed", String(record.id === modelID));
        remove.className = "icon-button";
        remove.dataset.removeModel = record.id;
        remove.textContent = "×";
        remove.setAttribute("aria-label", "Remove " + record.name);
        row.append(color, pick, remove);
        return row;
      }),
    );
    $("scene-count").textContent = records.size;
    $("scene-arrangement").disabled = records.size === 0;
  }
  function renderScene() {
    const has = records.size > 0;
    if (!has && selectionMode) setSelectionMode(false);
    $("workspace").classList.toggle("has-models", has);
    $("viewer").hidden = !has && !busy;
    $("empty-state").hidden = has || busy;
    $("file-heading").hidden = !has;
    $("model-controls").hidden = !has;
    $("filename").textContent = records.get(modelID)?.name || "";
    $("filename").title = $("filename").textContent;
    $("open-label").textContent = has ? "Add models" : "Open files";
    $("drop-message").textContent = has
      ? "Add to your scene."
      : "Drop it here.";
    renderList();
    syncControls();
    populateInfo();
    if (!has) closePanels();
    syncSelection();
  }
  function setBusy(value) {
    if (value) exportUI?.close();
    if (disposed) return;
    if (value && selectionMode) setSelectionMode(false);
    if (value) setMoveMode(false);
    busy = value;
    $("loading-state").hidden = !value;
    $("workspace").setAttribute("aria-busy", String(value));
    renderScene();
  }
  function selectModel(id) {
    exportUI?.close();
    if (!records.has(id)) return;
    if (selectionMode) modelMover?.setEnabled(false);
    else setMoveMode(false);
    appearanceRequest++;
    modelID = id;
    renderScene();
    if (selectionMode) setMoveMode(true, transformTool, true);
  }
  function placements() {
    return scenePlacement([...records.values()], $("scene-arrangement").value);
  }
  function updateGrid() {
    viewer?.set_infinite_grid(gridEnabled, gridSpacing, gridHeight);
    $("grid-button").setAttribute("aria-pressed", String(gridEnabled));
  }
  function arrangeScene() {
    setMoveMode(false);
    // A custom scene must retain the current animated pose when files are added.
    for (const record of records.values())
      syncAnimatedRecord(record, viewer?._models.get(record.id));
    if ($("scene-arrangement").value === "custom") return;
    for (const record of records.values()) prepareManual(record.id);
    if ($("scene-arrangement").value === "original")
      for (const record of records.values())
        record.rotation = {
          ...(record.originalRotation || { x: 0, y: 0, z: 0 }),
        };
    const positions = placements();
    for (const p of positions) {
      records.get(p.id).position = { x: p.x, y: p.y, z: p.z };
      renderTransform(records.get(p.id));
    }
    if ($("scene-arrangement").value !== "custom" || !records.size)
      gridHeight = sceneFloor([...records.values()], positions);
    syncPosition();
    updateGrid();
    viewer?.set_auto_zoom();
  }

  function syncPosition(preserveFocus = false) {
    const record = records.get(modelID);
    for (const axis of ["x", "y", "z"]) {
      const input = $("position-" + axis);
      if (!preserveFocus || document.activeElement !== input)
        input.value = Number((record?.position?.[axis] || 0).toPrecision(12));
      input.disabled = !record;
      input.removeAttribute("aria-invalid");
    }
    $("position-error").hidden = true;
    $("position-units").textContent = record?.animationPivot
      ? "Position of the model center in the scene, in mm."
      : "Offset from file coordinates, in mm.";
    $("move-model-button").disabled = !record || busy;
    $("reset-position").disabled = !record;
    syncRotation(preserveFocus);
    for (const id of [
      "rotate-model-button",
      "depth-model-button",
      "depth-nearer",
      "depth-farther",
    ])
      $(id).disabled = !record || busy;
  }
  function applyPosition(id, position, refreshInputs = true) {
    if (
      !records.has(id) ||
      !Object.values(position).every(
        (v) => Number.isFinite(v) && Math.abs(v) <= 1e12,
      )
    )
      return false;
    records.get(id).position = { ...position };
    renderTransform(records.get(id));
    $("scene-arrangement").value = "custom";
    if (id === modelID && refreshInputs) syncPosition();
    return true;
  }
  function renderTransform(record) {
    const p = enginePosition(record),
      r = record.rotation;
    viewer.set_rotation(
      record.id,
      ...["x", "y", "z"].map((axis) => ((r[axis] % 360) * Math.PI) / 180),
    );
    viewer.set_position(record.id, p.x, p.y, p.z);
  }
  function selectedTransform() {
    prepareManual(modelID);
    const record = records.get(modelID);
    return record
      ? { ...record, center: modelCenter(record), radius: modelRadius(record) }
      : null;
  }
  function syncRotation(preserveFocus = false) {
    const record = records.get(modelID);
    for (const axis of ["x", "y", "z"]) {
      const input = $("rotation-" + axis);
      if (!preserveFocus || document.activeElement !== input)
        input.value = Number((record?.rotation?.[axis] || 0).toPrecision(10));
      input.disabled = !record;
      input.removeAttribute("aria-invalid");
    }
    $("rotation-error").hidden = true;
    $("reset-rotation").disabled = !record;
  }
  function applyRotation(id, rotation, refreshInputs = true) {
    if (
      !records.has(id) ||
      !Object.values(rotation).every(
        (v) => Number.isFinite(v) && Math.abs(v) <= 360000,
      )
    )
      return false;
    records.get(id).rotation = { ...rotation };
    renderTransform(records.get(id));
    $("scene-arrangement").value = "custom";
    if (refreshInputs && id === modelID) syncRotation();
    return true;
  }
  const toolLabels = { move: "Move", rotate: "Rotate", depth: "Depth" };
  const toolHints = {
    move: "Drag to move the selected model",
    rotate: "Drag to rotate the selected model",
    depth: "Drag up for nearer, down for farther",
  };
  function syncTool() {
    if (viewer?.canvas) viewer.canvas.dataset.modelTool = transformTool;
    root
      .querySelectorAll("[data-transform-tab]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.transformTab === transformTool),
        ),
      );
    for (const name of ["move", "rotate", "depth"]) {
      $(name + "-controls").hidden = name !== transformTool;
      $(name + "-model-button").setAttribute(
        "aria-pressed",
        String(moveMode && name === transformTool),
      );
    }
    $("model-tool").value = transformTool;
    $("move-gesture-message").textContent =
      (selectionMode ? "Click a model to select · " : "") +
      toolHints[transformTool] +
      " · Scroll to adjust depth";
  }
  function setMoveMode(enabled, tool = transformTool, retainPaused = false) {
    modelMover?.setEnabled(false);
    transformTool = tool;
    moveMode = !!enabled && modelID !== null && !busy;
    if (!moveMode && selectionMode) {
      selectionMode = false;
      $("workspace").classList.remove("selecting-model-mode");
    }
    if (viewer) viewer.controls.enabled = !selectionMode;
    syncShortcuts();
    if (moveMode && !retainPaused) prepareManual(modelID);
    modelMover?.setEnabled(moveMode);
    syncTool();
    $("move-mode").hidden = !moveMode;
    $("move-mode-name").textContent = records.get(modelID)?.name || "";
    $("workspace").classList.toggle("moving-model-mode", moveMode);
    if (viewer?.canvas)
      viewer.canvas.setAttribute(
        "aria-label",
        moveMode
          ? (selectionMode ? "Click a model to select. " : "") +
              toolHints[transformTool] +
              ". Scroll changes only its depth. Escape exits."
          : "3D model viewer. Drag to rotate, shift-drag to pan, scroll to zoom.",
      );
    if (moveMode) {
      closePanels();
      viewer.canvas.focus({ preventScroll: true });
      announce(
        toolLabels[transformTool] +
          " tool for " +
          records.get(modelID).name +
          ". Done or Escape returns to viewing.",
      );
    }
    syncSelection();
  }
  for (const axis of ["x", "y", "z"]) {
    const input = $("rotation-" + axis);
    listen(input, "input", () => {
      if (modelID === null || !input.value.trim()) return;
      prepareManual(modelID);
      if (
        applyRotation(
          modelID,
          { ...records.get(modelID).rotation, [axis]: input.valueAsNumber },
          false,
        )
      ) {
        input.removeAttribute("aria-invalid");
        $("rotation-error").hidden = true;
      }
    });
    listen(input, "change", () => {
      if (modelID === null) return;
      prepareManual(modelID);
      if (
        !input.value.trim() ||
        !applyRotation(modelID, {
          ...records.get(modelID).rotation,
          [axis]: input.valueAsNumber,
        })
      ) {
        input.setAttribute("aria-invalid", "true");
        $("rotation-error").hidden = false;
      } else announce("Model rotation updated.");
    });
  }
  listen($("reset-rotation"), "click", () => {
    setMoveMode(false);
    if (modelID !== null) {
      prepareManual(modelID);
      applyRotation(modelID, {
        ...(records.get(modelID).originalRotation || { x: 0, y: 0, z: 0 }),
      });
      announce("Selected model rotation reset.");
    }
  });
  for (const name of ["move", "rotate", "depth"])
    listen($(name + "-model-button"), "click", () =>
      setMoveMode(!moveMode || transformTool !== name, name),
    );
  for (const [id, amount] of [
    ["depth-nearer", -0.12],
    ["depth-farther", 0.12],
  ])
    listen($(id), "click", () => {
      const model = selectedTransform();
      if (!model) return;
      applyPosition(
        model.id,
        depthPosition(model, viewer.get_camera_state(), amount),
      );
      announce(
        amount < 0
          ? "Selected model moved nearer."
          : "Selected model moved farther.",
      );
    });
  root
    .querySelectorAll("[data-transform-tab]")
    .forEach((b) =>
      listen(b, "click", () =>
        setMoveMode(selectionMode, b.dataset.transformTab, true),
      ),
    );
  listen($("model-tool"), "change", () =>
    setMoveMode(true, $("model-tool").value, selectionMode),
  );
  for (const axis of ["x", "y", "z"]) {
    const input = $("position-" + axis);
    listen(input, "input", () => {
      if (modelID === null || !input.value.trim()) return;
      prepareManual(modelID);
      if (
        applyPosition(
          modelID,
          { ...records.get(modelID).position, [axis]: input.valueAsNumber },
          false,
        )
      ) {
        input.removeAttribute("aria-invalid");
        $("position-error").hidden = true;
      }
    });
    listen(input, "change", () => {
      if (modelID === null) return;
      prepareManual(modelID);
      if (
        !input.value.trim() ||
        !applyPosition(modelID, {
          ...records.get(modelID).position,
          [axis]: input.valueAsNumber,
        })
      ) {
        input.setAttribute("aria-invalid", "true");
        $("position-error").hidden = false;
      } else announce("Model position updated.");
    });
  }

  listen($("finish-move"), "click", () => {
    setMoveMode(false);
    viewer?.canvas.focus({ preventScroll: true });
  });
  listen($("reset-position"), "click", () => {
    setMoveMode(false);
    if (modelID !== null) {
      prepareManual(modelID);
      applyPosition(modelID, {
        ...(records.get(modelID).originalPosition || { x: 0, y: 0, z: 0 }),
      });
      announce("Selected model restored to its original position.");
    }
  });
  listen(window, "blur", () => {
    if (moveMode) setMoveMode(false);
  });

  function cancelLoading() {
    generation++;
    queue.length = 0;
    sceneImport?.abort();
    if (loadingID !== null) {
      viewer?.remove_model(loadingID);
      loadingID = null;
    }
    setBusy(false);
    announce("Opening cancelled.");
  }
  function clearScene() {
    exportUI?.close();
    setMoveMode(false);
    cancelLoading();
    appearanceRequest++;
    viewer?.clean();
    records.clear();
    modelID = null;
    gridEnabled = false;
    gridHeight = 0;
    gridSpacing = 1;
    $("scene-arrangement").value = "original";
    updateGrid();
    $("notice").hidden = true;
    renderScene();
    announce("Scene cleared.");
  }
  function removeModel(id) {
    if (!records.has(id)) return;
    exportUI?.close();
    const name = records.get(id).name;
    setMoveMode(false);
    viewer.remove_model(id);
    records.delete(id);
    appearanceRequest++;
    if (modelID === id) modelID = [...records.keys()].at(-1) ?? null;
    arrangeScene();
    renderScene();
    announce(name + " removed.");
  }
  function prepareManual(id) {
    if (!records.has(id)) return;
    syncAnimatedRecord(records.get(id), viewer?._models.get(id));
    viewer?.animate_model(id, null);
  }
  function refreshAnimatedPose() {
    if (disposed || modelID === null) return;
    syncAnimatedRecord(records.get(modelID), viewer?._models.get(modelID));
    if (!$("info-panel").hidden) populateInfo();
    if (!$("scene-panel").hidden && $("position-details").open)
      syncPosition(true);
  }
  function animationChanged(id, state, reason) {
    if (disposed) return;
    if (
      reason === "restored" &&
      state.status === "running" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    )
      viewer.pause_model_animation(id);
    syncAnimatedRecord(records.get(id), viewer?._models.get(id));
    if (["started", "restored", "resumed"].includes(reason))
      $("scene-arrangement").value = "custom";
    if (id === modelID) refreshAnimatedPose();
    animationUI?.sync();
    printUI?.sync();
    options.animation_state_callback?.(id, state, reason);
  }
  async function getViewer() {
    if (!viewerPromise)
      viewerPromise = Promise.resolve()
        .then(async () => {
          if (disposed) throw new Error("ViewSTL app is disposed");
          viewer = new StlViewer($("viewer"), {
            ...policy.limits,
            worker_count: 1,
            worker_timeout: options.worker_timeout ?? 600000,
            worker_url: options.worker_url,
            worker_factory: options.worker_factory,
            url_import_endpoint: options.url_import_endpoint,
            center_models: false,
            bg_color: background,
            allow_drag_and_drop: false,
            animation_state_callback: animationChanged,
            animation_complete_callback: (...args) => {
              if (!disposed) options.animation_complete_callback?.(...args);
            },
            camera_state: {
              position: { x: 90, y: -130, z: 90 },
              target: { x: 0, y: 0, z: 0 },
              up: { x: 0, y: 0, z: 1 },
            },
            loading_progress_callback: (status) => {
              if (disposed || !busy || sceneImport) return;
              const p = status[loadingID];
              $("loading-label").textContent =
                p?.phase === "loading-cad"
                  ? "Loading the CAD reader…"
                  : p?.phase === "parsing-cad"
                    ? "Preparing CAD surfaces…"
                    : p?.loaded && !p.total
                      ? `Downloading your file… ${fileSize(p.loaded)}`
                      : p?.total && p.loaded < p.total
                        ? `Reading your file… ${Math.min(99, Math.floor((100 * p.loaded) / p.total))}%`
                        : "Preparing your model…";
            },
            model_loaded_callback: (id) => {
              lastLoadedID = id;
            },
            load_error_callback: (message) => {
              showNotice(
                /limit exceeded|safety budget/i.test(message)
                  ? `This scene or view mode exceeds the estimated memory budget for this device (${fileSize(policy.budget)}). Remove a model, use Solid view without smoothing, or try a device with more memory.`
                  : `Couldn’t display this model. ${message}`,
              );
            },
          });
          await viewer.when_ready;
          if (disposed) throw new Error("ViewSTL app is disposed");
          modelMover = bindModelMove(viewer.canvas, {
            getCamera: () => viewer.get_camera_state(),
            getModel: (event) => {
              if (selectionMode && event) {
                const hit = viewer.pick_model(event.clientX, event.clientY);
                if (!hit || !records.has(hit.id)) return null;
                if (hit.id !== modelID) selectModel(hit.id);
              }
              return selectedTransform();
            },
            getTool: () => transformTool,
            onRotate: (id, rotation) => applyRotation(id, rotation),
            onMove: (id, position) => applyPosition(id, position),
            onStart: () => {
              dragArrangement = $("scene-arrangement").value;
            },
            onEnd: (id, cancelled) => {
              if (cancelled) $("scene-arrangement").value = dragArrangement;
              announce(cancelled ? "Move cancelled." : "Model updated.");
            },
          });
          listen(viewer.canvas, "dblclick", (event) => {
            if (busy || selectionMode || event.button !== 0) return;
            editModelAt(event);
          });
          return viewer;
        })
        .catch((error) => {
          modelMover?.dispose();
          modelMover = null;
          viewer?.dispose();
          viewer = null;
          viewerPromise = null;
          throw error;
        });
    return viewerPromise;
  }
  function addFiles(files) {
    assertActive();
    const accepted = [];
    for (const source of files) {
      if (!/\.(stl|obj|3mf|step|stp|iges|igs|vsb|vsj)$/i.test(source.name)) {
        showNotice(
          "Choose STL, OBJ, 3MF, STEP/STP, IGES/IGS, VSB or VSJ files.",
        );
        continue;
      }
      if (source.size === 0) {
        showNotice("This file is empty. Choose a file containing a 3D model.");
        continue;
      }
      accepted.push(source);
    }
    const scenes = accepted.filter((f) => sceneFormat(f.name));
    if (scenes.length) {
      const batch = {
        files: accepted.filter((f) => !sceneFormat(f.name)),
        used: new Set(),
        failed: false,
      };
      for (const sceneFile of scenes)
        queue.push({ name: sceneFile.name, sceneFile, batch });
      queue.push({ remaining: batch });
    } else queue.push(...accepted);
    if (queue.length && !draining) drainPromise = drainQueue();
    return drainPromise || Promise.resolve();
  }
  function openURL(value, format = "") {
    assertActive();
    if (!options.url_import_endpoint)
      throw new Error("URL imports are not configured.");
    const url = new URL(value.trim());
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error(
        "Use a public HTTP or HTTPS file URL without login credentials.",
      );
    if (format && !/^(stl|obj|3mf|step|stp|iges|igs|vsb|vsj)$/.test(format))
      throw new Error("Choose a supported 3D format.");
    url.hash = "";
    // Keep signed query strings out of visible names and scene exports.
    const name = decodeURIComponent(
      url.pathname.split("/").at(-1) || "Remote model",
    ).slice(0, 200);
    queue.push({
      name,
      remote: url.href,
      format,
      size: 0,
      scene: ["vsb", "vsj"].includes(format) ? format : sceneFormat(name),
    });
    if (!draining) drainPromise = drainQueue();
    return drainPromise || Promise.resolve();
  }
  if ($("url-form") && $("url-dialog")) {
    listen($("url-form"), "submit", (event) => {
      event.preventDefault();
      try {
        const work = openURL($("url-input").value, $("url-format").value);
        $("url-input").value = "";
        $("url-error").hidden = true;
        $("url-dialog").close();
        work.catch((error) => showNotice(error.message));
      } catch (error) {
        $("url-error").textContent = error.message;
        $("url-error").hidden = false;
      }
    });
  }
  async function drainQueue() {
    if (draining) return;
    draining = true;
    try {
      while (queue.length) {
        const source = queue.shift(),
          token = generation;
        if (source.remaining) {
          if (!source.remaining.failed)
            queue.unshift(
              ...source.remaining.files.filter(
                (f) => !source.remaining.used.has(f),
              ),
            );
          continue;
        }
        setBusy(true);
        $("notice").hidden = true;
        $("loading-label").textContent = "Opening " + source.name + "…";
        announce("Opening " + source.name);
        try {
          if (source.sceneFile || source.scene) {
            await openSceneSource(source, token);
            continue;
          }
          const estimated = await estimateFile(source);
          if (token !== generation) continue;
          const resident = [...records.values()].reduce(
            (sum, r) => sum + r.estimated,
            0,
          );
          if (
            estimated + resident > policy.budget ||
            source.size > policy.limits.max_file_bytes
          )
            throw Error(
              `Adding this file would exceed the estimated ${fileSize(policy.budget)} scene memory budget. Remove a model or try a device with more memory.`,
            );
          const engine = await getViewer();
          if (token !== generation) continue;
          engine.do_resize();
          nextID = Math.max(nextID, engine.max_model_id + 1);
          const id = nextID++;
          loadingID = id;
          lastLoadedID = null;
          engine.add_model({
            id,
            display: "flat",
            ...(source.remote
              ? { remote_url: source.remote, remote_format: source.format }
              : source.url
                ? { filename: source.url }
                : { local_file: source }),
          });
          await engine.when_idle();
          if (token !== generation) continue;
          loadingID = null;
          const loaded =
            lastLoadedID === id
              ? engine.get_model_info(id, { measurements: false })
              : null;
          if (!loaded) {
            announce(source.name + " could not be opened.");
            continue;
          }
          if (source.remote) {
            source.name = loaded.name;
            source.size = loaded.file_bytes;
            delete source.remote;
          }
          const embedded = loaded.has_colors,
            originalColor = embedded
              ? null
              : palette[records.size % palette.length];
          if (originalColor) engine.set_color(id, originalColor);
          records.set(id, {
            id,
            name: source.name,
            size: source.size,
            units:
              loaded.source_units ||
              (/\.3mf$/i.test(source.name) ? "mm" : null),
            bounds: loaded.bounds,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            embedded,
            originalColor,
            color: originalColor,
            estimated: loaded.triangles * 224,
            sourceFile: source instanceof window.File ? source : null,
          });
          modelID = id;
          appearanceRequest++;
          arrangeScene();
          renderScene();
          announce(source.name + " is ready.");
          engine.canvas.focus({ preventScroll: true });
        } catch (error) {
          if (source.batch) source.batch.failed = true;
          if (token === generation) {
            if (loadingID !== null) {
              viewer?.remove_model(loadingID);
              loadingID = null;
            }
            showNotice(
              /WebGL/i.test(error.message)
                ? "3D viewing needs WebGL 2. Try enabling hardware acceleration in your browser, or use another device."
                : error.message,
            );
          }
        }
      }
    } finally {
      draining = false;
      setBusy(false);
    }
  }
  async function openSceneSource(source, token) {
    const engine = await getViewer();
    if (token !== generation) return;
    const controller = new window.AbortController();
    sceneImport = controller;
    try {
      const chosen = source.batch?.files || [];
      const cached = [
        ...new Set(
          [...records.values()].map((r) => r.sourceFile).filter(Boolean),
        ),
      ];
      const companions = [
        ...chosen,
        ...(source.sceneFile
          ? cached.filter(
              (f) =>
                !chosen.some((s) => s.name === f.name) &&
                cached.filter((s) => s.name === f.name).length === 1,
            )
          : []),
      ];
      const result = await engine.import_scene(
        source.sceneFile || source.remote,
        {
          format: source.scene || sceneFormat(source.name),
          signal: controller.signal,
          files: companions,
          on_progress(p) {
            if (token !== generation || disposed) return;
            $("loading-label").textContent =
              p.phase === "opening-model"
                ? `Opening scene model ${p.loaded + 1} of ${p.total}…`
                : p.phase === "complete"
                  ? "Restoring scene…"
                  : p.total
                    ? `Reading scene… ${Math.min(99, Math.floor((p.loaded / p.total) * 100))}%`
                    : "Reading scene…";
          },
        },
      );
      if (token !== generation) return;
      for (const file of result.used_files) source.batch?.used.add(file);
      for (const id of result.model_ids) {
        const m = engine._models.get(id),
          g = m.geometry;
        const bounds = Object.fromEntries(
          ["min", "max"].map((key) => [
            key,
            g.bounds[key].map((v, i) => (v - m.center[i]) * m.scaleVector[i]),
          ]),
        );
        const record = {
          id,
          name: String(m.display_name || m.orig_filename || m.filename)
            .split(/[\\/]/)
            .pop()
            .split(/[?#]/)[0],
          size: g.file_bytes ?? m.local_file?.size ?? null,
          units: g.units || m.units,
          bounds,
          position: { x: 0, y: 0, z: 0 },
          rotation: {
            x: (m.rotationx * 180) / Math.PI,
            y: (m.rotationy * 180) / Math.PI,
            z: (m.rotationz * 180) / Math.PI,
          },
          embedded: !!g.colors,
          color: m.color || (g.colors ? null : "#909090"),
          estimated: g.triangles * 224,
          sourceFile: result.used_files.includes(m.local_file)
            ? m.local_file
            : null,
        };
        const offset = enginePosition(record);
        for (const axis of ["x", "y", "z"])
          record.position[axis] = m[axis] - offset[axis];
        record.originalPosition = { ...record.position };
        record.originalRotation = { ...record.rotation };
        record.originalColor = record.color;
        records.set(id, record);
      }
      nextID = Math.max(nextID, engine.max_model_id + 1);
      modelID = result.model_ids.at(-1);
      appearanceRequest++;
      $("scene-arrangement").value = "custom";
      gridEnabled = !!engine.grid;
      gridHeight = engine.grid?.height || 0;
      gridSpacing = engine.grid?.spacing || 1;
      $("grid-button").setAttribute("aria-pressed", String(gridEnabled));
      setBackground(engine.bg_color);
      renderScene();
      announce(
        source.name + " opened. " + result.model_ids.length + " models added.",
      );
      engine.canvas.focus({ preventScroll: true });
    } finally {
      if (sceneImport === controller) sceneImport = null;
    }
  }
  root
    .querySelectorAll("[data-open-file]")
    .forEach((b) => listen(b, "click", () => $("file-input").click()));
  for (const button of shortcutButtons)
    listen(button, "click", () => {
      if (button.disabled || busy || !records.size) return;
      const action = button.dataset.viewstlShortcut;
      if (action === "save") $("save-button")?.click();
      else if (action === "select") {
        setSelectionMode(!selectionMode);
        closePanels();
        announce(
          selectionMode
            ? "Selection mode. Click a model to select; drag to move. Done or Escape returns to viewing."
            : "Viewing mode. Drag to rotate the scene.",
        );
      } else if (
        [
          "front",
          "back",
          "left",
          "right",
          "top",
          "bottom",
          "isometric",
        ].includes(action)
      ) {
        setMoveMode(false);
        setSelectionMode(false);
        viewer.set_camera_view(action);
        toolsUI?.sync();
        announce(button.title || action + " view");
      }
    });
  listen(window, "resize", () => {
    // Do not strand users in a desktop-only mode after rotating/narrowing a screen.
    if (
      selectionMode &&
      !shortcutButtons.some(
        (button) =>
          button.dataset.viewstlShortcut === "select" &&
          button.getClientRects().length,
      )
    )
      setSelectionMode(false);
  });
  listen($("file-input"), "change", () => {
    const files = [...$("file-input").files];
    $("file-input").value = "";
    addFiles(files);
  });
  $("sample-button").hidden = !sampleURL;
  listen($("sample-button"), "click", () => {
    if (sampleURL)
      void addFiles([
        { name: options.sample_name || "Sample.stl", url: sampleURL },
      ]);
  });
  listen($("close-model"), "click", () => removeModel(modelID));
  listen($("cancel-load"), "click", cancelLoading);
  listen($("clear-scene"), "click", clearScene);
  listen($("dismiss-notice"), "click", () => {
    $("notice").hidden = true;
  });
  listen($("fit-button"), "click", () => viewer?.set_auto_zoom());
  listen($("scene-arrangement"), "change", arrangeScene);
  listen($("model-list"), "click", (event) => {
    const b = event.target.closest("button");
    if (!b) return;
    if (b.dataset.removeModel !== undefined)
      removeModel(Number(b.dataset.removeModel));
    else if (b.dataset.selectModel !== undefined)
      selectModel(Number(b.dataset.selectModel));
    else if (b.dataset.colorModel !== undefined) {
      selectModel(Number(b.dataset.colorModel));
      togglePanel("colors");
    }
  });
  async function applyView() {
    if (modelID === null || busy) return;
    const request = ++appearanceRequest;
    const display = modeInputs.find((input) => input.checked).value;
    modeInputs.forEach((input) => {
      input.disabled = true;
    });
    $("smooth-shading").disabled = true;
    $("view-status").textContent = "Preparing view…";
    $("notice").hidden = true;
    try {
      viewer.set_view(modelID, {
        display,
        smooth_shading: $("smooth-shading").checked,
      });
      await viewer.when_idle();
    } finally {
      if (request === appearanceRequest) {
        syncControls();
        announce($("view-label").textContent + " view ready.");
      }
    }
  }
  modeInputs.forEach((input) => listen(input, "change", applyView));
  listen($("smooth-shading"), "change", applyView);
  for (const name of panelNames) {
    listen($(name + "-button"), "click", () => {
      if (name === "info") populateInfo();
      togglePanel(name);
      if (
        name === "section" &&
        !$("section-panel").hidden &&
        !$("section-enabled").checked
      ) {
        $("section-enabled").checked = true;
        applySection();
      }
    });
    listen($("close-" + name), "click", () => {
      closePanel(name);
      if (name === "colors") {
        togglePanel("view");
      }
      $(name + "-button").focus();
    });
  }
  function applySection() {
    if (modelID === null) return;
    const enabled = $("section-enabled").checked;
    viewer.set_section(
      modelID,
      enabled
        ? {
            axis: $("section-axis").value,
            position: Number($("section-position").value) / 100,
            flip: $("section-flip").getAttribute("aria-pressed") === "true",
          }
        : null,
    );
    $("section-value").textContent = $("section-position").value + "%";
    $("section-button").setAttribute("aria-pressed", String(enabled));
  }
  listen($("section-enabled"), "change", applySection);
  listen($("section-axis"), "change", applySection);
  listen($("section-position"), "input", applySection);
  listen($("section-flip"), "click", () => {
    $("section-flip").setAttribute(
      "aria-pressed",
      String($("section-flip").getAttribute("aria-pressed") !== "true"),
    );
    applySection();
  });
  listen($("grid-button"), "click", () => {
    gridEnabled = !gridEnabled;
    updateGrid();
  });
  function setColor(color) {
    if (modelID === null) return;
    viewer.set_color(modelID, color);
    records.get(modelID).color = color;
    syncColors();
    renderList();
  }
  listen($("model-color"), "input", () => setColor($("model-color").value));
  listen($("restore-color"), "click", () =>
    setColor(records.get(modelID)?.originalColor),
  );
  root
    .querySelectorAll("[data-model-color]")
    .forEach((b) => listen(b, "click", () => setColor(b.dataset.modelColor)));
  function setBackground(color) {
    background = color;
    const rgb =
      color === "transparent"
        ? [255, 255, 255]
        : [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    $("workspace").classList.toggle(
      "dark-background",
      rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 < 115,
    );
    viewer?.set_bg_color(color);
    syncColors();
  }
  listen($("background-color"), "input", () =>
    setBackground($("background-color").value),
  );
  root
    .querySelectorAll("[data-background]")
    .forEach((b) =>
      listen(b, "click", () => setBackground(b.dataset.background)),
    );
  listen($("image-button"), "click", async () => {
    if (modelID === null) return;
    const name =
      records.size > 1
        ? "viewstl-scene.png"
        : records.get(modelID).name.replace(/\.[^.]+$/, "") + ".png";
    try {
      const blob = await viewer.get_image_blob("image/png");
      if (disposed) return;
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      announce("Image ready to download.");
    } catch {
      showNotice("The image could not be saved. Please try again.");
    }
  });
  let dragDepth = 0;
  const acceptedDrag = (event) => {
    const kind = dropKind(event.dataTransfer);
    if (kind === "files") return kind;
    // Let URL/text inputs and editable content retain normal text-drop behavior.
    if (
      !options.url_import_endpoint ||
      event.target?.isContentEditable ||
      event.target?.closest?.("input, textarea")
    )
      return null;
    return kind;
  };
  const clearDrop = () => {
    dragDepth = 0;
    $("drop-overlay").hidden = true;
  };
  listen(dropTarget, "dragenter", (event) => {
    if (acceptedDrag(event)) {
      event.preventDefault();
      dragDepth++;
      $("drop-overlay").hidden = false;
    }
  });
  listen(dropTarget, "dragover", (event) => {
    if (acceptedDrag(event)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  });
  listen(dropTarget, "dragleave", (event) => {
    if (dragDepth > 0 && --dragDepth === 0) clearDrop();
  });
  listen(dropTarget, "drop", (event) => {
    const kind = acceptedDrag(event);
    clearDrop();
    if (!kind) return;
    event.preventDefault();
    try {
      if (kind === "files")
        addFiles([...event.dataTransfer.files]).catch((error) =>
          showNotice(error.message),
        );
      else
        for (const url of droppedURLs(event.dataTransfer))
          openURL(url).catch((error) => showNotice(error.message));
    } catch (error) {
      showNotice(error.message);
    }
  });
  listen(dropTarget, "dragend", clearDrop);
  listen(window, "blur", clearDrop);
  root
    .querySelectorAll("[data-dialog]")
    .forEach((b) => listen(b, "click", () => $(b.dataset.dialog).showModal()));
  root.querySelectorAll("dialog").forEach((dialog) =>
    listen(dialog, "click", (event) => {
      if (event.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (
          event.clientX < r.left ||
          event.clientX > r.right ||
          event.clientY < r.top ||
          event.clientY > r.bottom
        )
          if (dialog === $("save-dialog")) exportUI.close();
          else dialog.close();
      }
    }),
  );
  listen(root, "keydown", (event) => {
    if (event.key !== "Escape") return;
    if ($("save-dialog")?.open) return;
    if (selectionMode) {
      setSelectionMode(false);
      closePanels();
      announce("Viewing mode. Drag to rotate the scene.");
      return;
    }
    if (moveMode) {
      setMoveMode(false);
      announce("Move tool closed.");
      return;
    }
    const active = panelNames.find((name) => !$(name + "-panel").hidden);
    if (active) {
      closePanels();
      if (active === "colors") togglePanel("view");
      $(active + "-button").focus();
    }
  });
  listen(root, "pointerdown", (event) => {
    if (
      !event.target.closest(
        ".view-panel,.info-panel,.toolbar,.scene-heading-button,.move-mode",
      )
    )
      closePanels();
  });
  $("memory-budget").textContent =
    `Scene memory budget: ${fileSize(policy.budget)}. Half of ${policy.reported ? "the memory estimate reported by your browser" : "a conservative 2 GiB estimate because this browser does not report device memory"} is kept in reserve. This is an estimate, not a guarantee of available memory.`;
  $("scene-arrangement").value = "original";
  $("notice").hidden = true;
  $("drop-overlay").hidden = true;
  if ($("save-button"))
    exportUI = bindAppExport({
      $,
      listen,
      window,
      getState: () => ({
        busy,
        selectedId: modelID,
        models: [...records.values()],
      }),
      getViewer: () => viewer,
      onOpen: () => {
        setMoveMode(false);
        closePanels();
      },
      announce,
    });
  if ($("print-button"))
    printUI = bindAppPrint({
      $,
      listen,
      window,
      getState: () => ({
        busy,
        selectedId: modelID,
        models: [...records.values()],
      }),
      getViewer: () => viewer,
      onOpen: () => {
        setMoveMode(false);
        closePanels();
      },
      announce,
    });
  if ($("animation-details"))
    animationUI = bindAppAnimation({
      $,
      listen,
      window,
      getState: () => ({
        busy,
        selectedId: modelID,
        models: [...records.values()],
      }),
      getViewer: () => viewer,
      beforePlay(id) {
        setMoveMode(false);
        prepareManual(id);
        centerAnimationPivot(records.get(id), viewer._models.get(id));
        $("scene-arrangement").value = "custom";
      },
      refreshPose: refreshAnimatedPose,
      announce,
    });
  if ($("size-details"))
    toolsUI = bindAppTools({
      $,
      listen,
      window,
      getViewer: () => viewer,
      getState: () => ({ selectedId: modelID, busy }),
      refresh: renderScene,
      announce,
      changeSize(operation) {
        setMoveMode(false);
        const record = records.get(modelID);
        syncAnimatedRecord(record, viewer._models.get(modelID));
        operation();
        syncAnimatedRecord(record, viewer._models.get(modelID));
        $("scene-arrangement").value = "custom";
        renderScene();
      },
      duplicate() {
        const original = records.get(modelID),
          id = viewer.duplicate_model(modelID),
          m = viewer._models.get(id);
        const record = {
          ...original,
          id,
          name: m.display_name,
          position: { ...original.position },
          rotation: { ...original.rotation },
        };
        syncAnimatedRecord(record, m);
        record.originalPosition = { ...record.position };
        record.originalRotation = { ...record.rotation };
        records.set(id, record);
        nextID = Math.max(nextID, id + 1);
        $("scene-arrangement").value = "custom";
        selectModel(id);
        setMoveMode(true, "move", true);
        announce("Copy selected at the same position. Drag to move it.");
      },
    });
  updateGrid();
  setBusy(false);
  setMoveMode(false);

  const api = {
    openFiles: addFiles,
    openURL,
    cancelLoading() {
      assertActive();
      cancelLoading();
    },
    clear() {
      assertActive();
      clearScene();
    },
    select(id) {
      assertActive();
      selectModel(id);
    },
    remove(id) {
      assertActive();
      removeModel(id);
    },
    getState() {
      assertActive();
      for (const record of records.values())
        syncAnimatedRecord(record, viewer?._models.get(record.id));
      return {
        selectedId: modelID,
        busy,
        arrangement: $("scene-arrangement").value,
        memoryBudget: policy.budget,
        models: [...records.values()].map((record) => ({
          id: record.id,
          name: record.name,
          size: record.size,
          units: record.units,
          position: { ...record.position },
          rotation: { ...record.rotation },
          color: record.color,
          animation: viewer.get_model_animation_state(record.id),
        })),
      };
    },
    dispose() {
      if (disposed) return;
      exportUI?.dispose();
      printUI?.dispose();
      animationUI?.dispose();
      toolsUI?.dispose();
      cancelLoading();
      setMoveMode(false);
      appearanceRequest++;
      disposed = true;
      abort.abort();
      modelMover?.dispose();
      viewer?.dispose();
      records.clear();
      if (options.id_prefix)
        modeInputs.forEach((input) => (input.name = "view-mode"));
      mountedRoots.delete(root);
    },
  };
  mountedRoots.set(root, api);
  return api;
}
