export const toolsControls = [
  "size-details",
  "size-fields",
  "size-x",
  "size-y",
  "size-z",
  "size-lock",
  "size-percent",
  "size-apply",
  "size-cancel",
  "size-reset",
  "size-error",
  "file-units",
  "file-units-note",
  "display-units",
  "size-unit-label",
  "duplicate-model",
  "camera-preset",
  "bookmark-name",
  "bookmark-list",
  "bookmark-save",
  "bookmark-restore",
  "bookmark-rename",
  "bookmark-delete",
  "camera-error",
  "info-area",
  "info-volume",
  "measure-model",
  "measure-cancel",
  "measure-status",
];
const axes = ["x", "y", "z"],
  format = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 7 });
export function bindAppTools({
  $,
  listen,
  window,
  getViewer,
  getState,
  changeSize,
  duplicate,
  refresh,
  announce,
}) {
  let draftKind = null,
    lastAxis = 0,
    base = null,
    selected = null,
    measurement = null,
    disposed = false;
  const error = (id, message = "") => {
    $(id).textContent = message;
    $(id).hidden = !message;
  };
  const factor = () => (getViewer()?.display_units === "inch" ? 25.4 : 1);
  const value = (v) => Number(v.toPrecision(10));
  function syncInfo() {
    const v = getViewer(),
      { selectedId, busy } = getState(),
      m = v?._models.get(selectedId);
    const s = m?.scaleVector,
      cached = m?._measurements;
    const valid =
      cached &&
      cached.positions === m.geometry.positions &&
      cached.key === s.join(",");
    const unit = factor() === 1 ? "mm" : "in";
    const area = valid
      ? cached.result.area_mm2
      : s && s[0] === s[1] && s[1] === s[2]
        ? m.geometry.area * s[0] ** 2
        : null;
    $("info-area").textContent =
      area == null
        ? "Calculate"
        : format.format(area / factor() ** 2) + " " + unit + "²";
    $("info-volume").textContent = valid
      ? cached.result.volume_valid
        ? format.format(cached.result.volume_mm3 / factor() ** 3) +
          " " +
          unit +
          "³"
        : "Unavailable"
      : "Not checked";
    if (!measurement)
      $("measure-status").textContent = valid
        ? cached.result.volume_reason
        : "Calculate to check enclosed volume. Runs on your device.";
    $("measure-model").disabled = busy || !m || !!measurement;
    $("measure-cancel").hidden = !measurement;
  }
  function syncBookmarks() {
    const v = getViewer(),
      previous = $("bookmark-list").value,
      bookmarks = v?.get_camera_bookmarks() || [];
    $("bookmark-list").replaceChildren(
      ...bookmarks.map((b) => {
        const option = window.document.createElement("option");
        option.value = b.name;
        option.textContent = b.name;
        return option;
      }),
    );
    if (bookmarks.some((b) => b.name === previous))
      $("bookmark-list").value = previous;
    for (const id of [
      "bookmark-restore",
      "bookmark-rename",
      "bookmark-delete",
      "bookmark-list",
    ])
      $(id).disabled = !bookmarks.length;
    $("bookmark-save").disabled = !v || bookmarks.length >= 32;
  }
  function sync() {
    if (disposed) return;
    const { selectedId, busy } = getState(),
      v = getViewer(),
      m = v?._models.get(selectedId);
    if (selectedId !== selected) {
      measurement?.abort();
      selected = selectedId;
    }
    draftKind = null;
    base = m?.geometry ? v.get_model_size(selectedId) : null;
    $("size-fields").disabled = busy || !base;
    $("duplicate-model").disabled = busy || !base;
    $("display-units").value = v?.display_units || "mm";
    $("size-unit-label").textContent =
      factor() === 1 ? "Dimensions in mm" : "Dimensions in inches";
    $("file-units").value = base?.file_units || "mm";
    $("file-units").disabled = busy || !base?.editable;
    $("file-units-note").textContent = base?.editable
      ? "STL/OBJ have no units. Millimetres are assumed; choose inches to correct the physical size."
      : "Explicit file units were converted to millimetres on import.";
    axes.forEach((a, i) => {
      $("size-" + a).value = base
        ? value(base.dimensions_mm[i] / factor())
        : "";
      $("size-" + a).disabled = !base || base.dimensions_mm[i] === 0;
    });
    const ratios =
      base?.baseline_mm
        .map((v, i) => (v ? base.dimensions_mm[i] / v : null))
        .filter((v) => v != null) || [];
    $("size-percent").value =
      ratios.length && ratios.every((v) => Math.abs(v / ratios[0] - 1) < 1e-8)
        ? value(ratios[0] * 100)
        : "";
    error("size-error");
    syncInfo();
    syncBookmarks();
  }
  const attempt = (id, action) => {
    try {
      action();
      error(id);
    } catch (e) {
      error(id, e.message);
    }
  };
  axes.forEach((a, i) =>
    listen($("size-" + a), "input", () => {
      if (!base) return;
      draftKind = "axis";
      lastAxis = i;
      const n = $("size-" + a).valueAsNumber;
      if (!Number.isFinite(n) || n <= 0) return;
      if ($("size-lock").checked)
        axes.forEach((axis, j) => {
          if (i !== j)
            $("size-" + axis).value = value(
              (n * base.dimensions_mm[j]) / base.dimensions_mm[i],
            );
        });
      $("size-percent").value = "";
    }),
  );
  listen($("size-percent"), "input", () => {
    draftKind = "percent";
    const n = $("size-percent").valueAsNumber;
    if (base && Number.isFinite(n) && n > 0)
      axes.forEach(
        (a, i) =>
          ($("size-" + a).value = value(
            (base.baseline_mm[i] * n) / 100 / factor(),
          )),
      );
  });
  listen($("size-apply"), "click", () =>
    attempt("size-error", () => {
      if (!base) return;
      if (!draftKind) return;
      const current = getViewer().get_model_size(selected).dimensions_mm;
      let desired = axes.map((a) => $("size-" + a).valueAsNumber * factor());
      if (draftKind === "percent") {
        const percent = $("size-percent").valueAsNumber;
        if (!Number.isFinite(percent) || percent <= 0)
          throw new Error("Enter a positive scale percentage.");
        desired = base.baseline_mm.map((v) => (v * percent) / 100);
      } else if ($("size-lock").checked) {
        const ratio = desired[lastAxis] / base.dimensions_mm[lastAxis];
        desired = base.dimensions_mm.map((v) => v * ratio);
      }
      let ratios = desired.map((n, i) => {
        if (!Number.isFinite(n) || n < 0 || (current[i] > 0 && n === 0))
          throw new Error("Enter positive dimensions for each non-flat axis.");
        return current[i] ? n / current[i] : 1;
      });
      if (ratios.every((v) => Math.abs(v / ratios[0] - 1) < 1e-12))
        ratios = ratios.map(() => ratios[0]);
      changeSize(() => getViewer().resize_model(selected, ratios));
      announce("Model size updated.");
    }),
  );
  listen($("size-cancel"), "click", sync);
  listen($("size-reset"), "click", () =>
    attempt("size-error", () => {
      changeSize(() => getViewer().reset_model_size(selected));
      announce("Original size restored; file-unit correction retained.");
    }),
  );
  listen($("file-units"), "change", () =>
    attempt("size-error", () => {
      changeSize(() =>
        getViewer().set_file_units(selected, $("file-units").value),
      );
      announce("File units corrected.");
    }),
  );
  listen($("display-units"), "change", () => {
    getViewer()?.set_display_units($("display-units").value);
    refresh();
  });
  listen($("duplicate-model"), "click", () => attempt("size-error", duplicate));
  listen($("camera-preset"), "change", () =>
    attempt("camera-error", () => {
      if ($("camera-preset").value)
        getViewer().set_camera_view($("camera-preset").value);
      announce("Camera view updated.");
      $("camera-preset").value = "";
    }),
  );
  const editBookmarks = (action) =>
    attempt("camera-error", () => {
      const v = getViewer(),
        bookmarks = v.get_camera_bookmarks();
      action(bookmarks, v);
      v.set_camera_bookmarks(bookmarks);
      syncBookmarks();
    });
  listen($("bookmark-save"), "click", () =>
    editBookmarks((b, v) => {
      b.push({ name: $("bookmark-name").value, camera: v.get_camera_state() });
    }),
  );
  listen($("bookmark-rename"), "click", () =>
    editBookmarks((b) => {
      b.find((b) => b.name === $("bookmark-list").value).name =
        $("bookmark-name").value;
    }),
  );
  listen($("bookmark-delete"), "click", () =>
    editBookmarks((b) => {
      b.splice(
        b.findIndex((b) => b.name === $("bookmark-list").value),
        1,
      );
    }),
  );
  listen($("bookmark-restore"), "click", () =>
    attempt("camera-error", () => {
      const b = getViewer()
        .get_camera_bookmarks()
        .find((b) => b.name === $("bookmark-list").value);
      if (b) {
        getViewer().set_camera_state(b.camera);
        announce("Saved view restored.");
      }
    }),
  );
  listen(
    $("bookmark-list"),
    "change",
    () => ($("bookmark-name").value = $("bookmark-list").value),
  );
  listen($("measure-cancel"), "click", () => measurement?.abort());
  listen($("measure-model"), "click", async () => {
    const id = selected,
      v = getViewer(),
      controller = new window.AbortController();
    measurement = controller;
    syncInfo();
    $("measure-status").textContent = "Calculating area and checking volume…";
    try {
      await v.measure_model(id, {
        signal: controller.signal,
        on_progress: (p) => {
          if (selected === id && !disposed)
            $("measure-status").textContent = p.phase + "…";
        },
      });
      if (!disposed && selected === id) announce("Measurements ready.");
    } catch (e) {
      if (!disposed && selected === id)
        $("measure-status").textContent =
          e.name === "AbortError" ? "Calculation cancelled." : e.message;
    } finally {
      const message = $("measure-status").textContent;
      if (measurement === controller) measurement = null;
      if (!disposed) {
        syncInfo();
        if (!v._models.get(id)?._measurements && selected === id)
          $("measure-status").textContent = message;
      }
    }
  });
  return {
    sync,
    syncInfo,
    dispose() {
      disposed = true;
      measurement?.abort();
    },
  };
}
