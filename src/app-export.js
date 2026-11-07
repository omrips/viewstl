// Optional app controls. Geometry writing and downloads use the public viewer API.
export const exportControls = [
  "save-button",
  "save-dialog",
  "save-form",
  "save-fields",
  "save-name",
  "save-format",
  "save-scope",
  "save-colors",
  "save-colors-row",
  "save-format-note",
  "save-cad-note",
  "save-progress",
  "save-status",
  "save-error",
  "save-submit",
  "save-cancel",
  "save-close",
];

export function bindAppExport({
  $,
  listen,
  window,
  getState,
  getViewer,
  onOpen,
  announce,
}) {
  const dialog = $("save-dialog");
  let job = null,
    disposed = false,
    lastSuggestedName = "";
  const state = () => getState();
  const available = () =>
    !disposed && !state().busy && state().models.length > 0;
  const isScene = () => ["vsb", "vsj"].includes($("save-format").value);
  const clearError = () => {
    $("save-error").hidden = true;
    $("save-error").textContent = "";
  };
  function formatChanged() {
    const format = $("save-format").value;
    if (!$("save-name").value || $("save-name").value === lastSuggestedName) {
      suggestedName();
    }
    if ($("save-mesh-note")) $("save-mesh-note").hidden = isScene();
    if ($("save-scene-note")) $("save-scene-note").hidden = !isScene();
    $("save-colors-row").hidden = !["obj", "3mf"].includes(format);
    $("save-cad-note").hidden = !["step", "iges"].includes(format);
    // Explanatory copy belongs to the host's markup, not the export API.
    $("save-format-note").textContent =
      $("save-format").selectedOptions[0]?.dataset.note || "";
    $("save-submit").textContent =
      format === "obj" && $("save-colors").checked
        ? "Download ZIP"
        : "Download file";
    sync();
  }
  function suggestedName() {
    const { models, selectedId } = state();
    $("save-name").value = isScene()
      ? "viewstl-scene"
      : (models.find((m) => m.id === selectedId)?.name || "model").replace(
          /\.[^.]+$/,
          "",
        );
    lastSuggestedName = $("save-name").value;
  }
  function sync() {
    $("save-button").disabled = !available() || !!job;
    $("save-fields").disabled = !!job;
    $("save-submit").disabled = !available() || !!job;
    $("save-progress").hidden = !job;
    $("save-cancel").textContent = job ? "Cancel saving" : "Cancel";
    const { models, selectedId } = state();
    const target = isScene()
      ? `Entire scene · ${models.length} ${models.length === 1 ? "model" : "models"}`
      : "Selected model: " +
        (models.find((m) => m.id === selectedId)?.name || "model");
    if ($("save-scope").textContent !== target)
      $("save-scope").textContent = target;
  }
  function cancel() {
    if (job) {
      const previous = job;
      job = null;
      previous.abort();
      announce("Saving cancelled.");
    }
    $("save-status").textContent = "";
    sync();
  }
  function close() {
    // Abort synchronously: a queued dialog 'close' event could otherwise allow a download.
    cancel();
    if (dialog.open) dialog.close();
  }
  listen($("save-button"), "click", () => {
    if (!available() || job) return;
    onOpen();
    clearError();
    $("save-status").textContent = "";
    suggestedName();
    formatChanged();
    sync();
    dialog.showModal();
  });
  listen($("save-format"), "change", () => {
    clearError();
    formatChanged();
  });
  listen($("save-colors"), "change", formatChanged);
  listen($("save-cancel"), "click", close);
  listen($("save-close"), "click", close);
  listen(dialog, "cancel", (event) => {
    event.preventDefault();
    close();
  });
  listen(dialog, "close", () => {
    if (!dialog.open) cancel();
  });
  listen($("save-form"), "submit", async (event) => {
    event.preventDefault();
    if (job || !available()) return;
    clearError();
    const { selectedId } = state();
    const controller = new window.AbortController();
    job = controller;
    $("save-progress").removeAttribute("value");
    $("save-status").textContent = "Preparing your file…";
    sync();
    try {
      const settings = {
        format: $("save-format").value,
        filename: $("save-name").value.trim() || "model",
        // App selection remains meaningful even when its editing frame is hidden.
        model_ids: [selectedId],
        units: "mm",
        apply_transforms: true,
        colors: $("save-colors").checked,
        signal: controller.signal,
        on_progress({ loaded, total, phase }) {
          if (job !== controller || controller.signal.aborted) return;
          const percent = total
            ? Math.min(100, Math.floor((100 * loaded) / total))
            : 0;
          $("save-progress").value = percent;
          $("save-status").textContent =
            phase === "packaging"
              ? "Packing your scene…"
              : percent === 100
                ? "Finishing your file…"
                : `Saving… ${percent}%`;
        },
      };
      const result = isScene()
        ? await getViewer().download_scene({
            format: settings.format,
            filename: settings.filename,
            signal: settings.signal,
            on_progress: settings.on_progress,
            force_basename: true,
          })
        : await getViewer().download_models(settings);
      if (job !== controller || disposed) return;
      job = null;
      close();
      announce(result.filename + " ready to download.");
    } catch (error) {
      if (job !== controller || disposed) return;
      job = null;
      $("save-status").textContent = "";
      if (error?.name !== "AbortError") {
        $("save-error").textContent =
          error?.message || "This file could not be saved. Try another format.";
        $("save-error").hidden = false;
      }
    } finally {
      if (!disposed && (!job || job === controller)) sync();
    }
  });
  formatChanged();
  sync();
  return {
    sync,
    close,
    dispose() {
      close();
      disposed = true;
    },
  };
}
