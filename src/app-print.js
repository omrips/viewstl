export const printControls = [
  "print-button",
  "print-panel",
  "print-close",
  "print-form",
  "print-fields",
  "print-scope",
  "print-level",
  "print-units",
  "print-fdm",
  "print-wall",
  "print-angle",
  "print-bed-x",
  "print-bed-y",
  "print-bed-z",
  "print-run",
  "print-cancel",
  "print-status",
  "print-results",
  "print-clear",
  "print-target",
];
export function bindAppPrint({
  $,
  listen,
  window,
  getState,
  getViewer,
  onOpen,
  announce,
}) {
  let job = null,
    report = null,
    timer = null,
    disposed = false,
    scopeKey = "",
    previousScope = "",
    unavailable = false;
  const panel = $("print-panel"),
    document = panel.ownerDocument;
  const pausedForCheck = new Set();
  const summary = {
    issues_found: "Issues found",
    incomplete: "Check incomplete",
    no_issues_found: "No issues found in completed checks",
  };
  const text = (tag, value) => {
    const el = document.createElement(tag);
    el.textContent = value;
    return el;
  };
  const stateIds = () =>
    $("print-scope").value === "all"
      ? getState().models.map((m) => m.id)
      : [getState().selectedId];
  const key = () => JSON.stringify(stateIds());
  const clear = () => {
    getViewer()?.clear_printability();
    $("print-clear").hidden = true;
  };
  function sync() {
    if (disposed) return;
    const s = getState();
    $("print-button").disabled = s.busy || !s.models.length;
    if (panel.hidden) return;
    for (const id of pausedForCheck)
      if (
        !s.models.some((m) => m.id === id) ||
        getViewer()?.get_model_animation_state(id)?.status !== "paused"
      )
        pausedForCheck.delete(id);
    if ($("print-resume")) {
      $("print-resume").hidden = !pausedForCheck.size;
      $("print-resume").disabled = !!job || s.busy;
    }
    if ($("print-animation-note"))
      $("print-animation-note").hidden = !pausedForCheck.size;
    const wasUnavailable = unavailable;
    unavailable = s.busy || !s.models.length;
    $("print-run").disabled = !!job || unavailable;
    if (previousScope !== key()) {
      $("print-units").checked = false;
      previousScope = key();
    }
    $("print-target").textContent =
      $("print-scope").value === "all"
        ? `All ${s.models.length} models, checked separately`
        : s.models.find((m) => m.id === s.selectedId)?.name ||
          "No model selected";
    if (job && (unavailable || scopeKey !== key())) cancel();
    if (
      report &&
      (!getViewer()?.is_printability_current(report) || scopeKey !== key())
    ) {
      report = null;
      $("print-units").checked = false;
      clear();
      $("print-results").replaceChildren();
      $("print-status").textContent =
        "Model or selection changed. Run the check again.";
    }
    if (unavailable) {
      if (!s.models.length) {
        report = null;
        clear();
        $("print-results").replaceChildren();
      }
      $("print-status").textContent = s.busy
        ? "Opening models. Checks will be available when loading finishes."
        : "Open a model to run a print check.";
    } else if (wasUnavailable && !job) {
      $("print-status").textContent = report
        ? summary[report.summary]
        : "Ready to check. Choose Run check to analyze the current model selection.";
    }
  }
  function render(value) {
    const elements = [];
    for (const model of value.models) {
      const section = document.createElement("section");
      section.append(
        text(
          "h3",
          getState().models.find((m) => m.id === model.model_id)?.name ||
            model.name,
        ),
      );
      section.append(
        text(
          "p",
          `${model.dimensions_mm?.map((v) => Number(v.toPrecision(5))).join(" × ") || "Unknown size"} mm · ${(model.elapsed_ms / 1000).toFixed(2)} s`,
        ),
      );
      if (model.volume_valid)
        section.append(
          text(
            "p",
            `Enclosed volume at current mm scale: ${Number(model.volume_mm3.toPrecision(6))} mm³`,
          ),
        );
      for (const c of model.checks) {
        const details = document.createElement("details");
        details.dataset.check = c.code;
        details.dataset.status = c.status;
        const status = {
          pass: "Passed",
          issue: c.severity === "info" ? "Information" : "Review",
          inconclusive: "Inconclusive",
          not_run: "Not run",
        }[c.status];
        details.append(
          text(
            "summary",
            `${status} · ${c.label}${c.count ? ` (${c.count})` : ""}${c.estimated ? " — estimate" : ""}`,
          ),
        );
        details.append(text("p", c.message));
        if (c.area_mm2 != null)
          details.append(
            text("p", `Area: ${Number(c.area_mm2.toPrecision(5))} mm²`),
          );
        if (c.minimum_sampled_mm != null)
          details.append(
            text(
              "p",
              `Smallest sampled distance: ${Number(c.minimum_sampled_mm.toPrecision(5))} mm`,
            ),
          );
        if (c.triangle_ids.length || c.edge_vertices.length) {
          const button = text("button", "Show locations");
          button.type = "button";
          button.dataset.issue = c.code;
          button.dataset.model = model.model_id;
          details.append(button);
          details.append(
            text(
              "p",
              "Highlights show a bounded sample, including edges hidden behind surfaces.",
            ),
          );
        }
        section.append(details);
      }
      elements.push(section);
    }
    $("print-results").replaceChildren(...elements);
  }
  function cancel() {
    job?.abort();
  }
  function close(focus = true) {
    cancel();
    panel.hidden = true;
    $("workspace")?.classList.remove("print-check-open");
    clear();
    window.clearInterval(timer);
    timer = null;
    $("print-button").setAttribute("aria-expanded", "false");
    if (focus && !disposed)
      ($("print-button").offsetParent && !$("print-button").disabled
        ? $("print-button")
        : $("info-button").offsetParent
          ? $("info-button")
          : $("sample-button")
      )?.focus();
  }
  function changed() {
    cancel();
    report = null;
    clear();
    $("print-results").replaceChildren();
    $("print-status").textContent = "Settings changed. Run the check again.";
    sync();
  }
  listen($("print-button"), "click", () => {
    if (!panel.hidden) {
      onOpen();
      sync();
      panel.scrollTop = 0;
      $("print-run").focus();
      return;
    }
    onOpen();
    panel.hidden = false;
    $("workspace")?.classList.add("print-check-open");
    $("print-button").setAttribute("aria-expanded", "true");
    sync();
    timer = window.setInterval(sync, 400);
    $("print-run").focus();
  });
  listen($("print-close"), "click", () => close());
  listen(panel, "keydown", (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      close();
    }
  });
  listen($("print-fields"), "change", changed);
  listen($("print-clear"), "click", clear);
  listen($("print-cancel"), "click", cancel);
  if ($("print-resume"))
    listen($("print-resume"), "click", () => {
      if (job || getState().busy) return;
      for (const id of pausedForCheck)
        if (
          getState().models.some((m) => m.id === id) &&
          getViewer().get_model_animation_state(id)?.status === "paused"
        )
          getViewer().resume_model_animation(id);
      pausedForCheck.clear();
      // Invalidate immediately rather than waiting for the next animation frame.
      report = null;
      clear();
      $("print-results").replaceChildren();
      $("print-status").textContent =
        "Animation resumed. Pause and run the check again for the new pose.";
      sync();
    });
  listen($("print-results"), "click", (e) => {
    const b = e.target.closest("button[data-issue]");
    if (!b || !report) return;
    try {
      getViewer().show_printability(report, {
        issue: b.dataset.issue,
        model_id: Number(b.dataset.model),
      });
      $("print-clear").hidden = false;
    } catch (error) {
      $("print-status").textContent = error.message;
    }
  });
  listen($("print-form"), "submit", async (e) => {
    e.preventDefault();
    if (job || getState().busy || !getState().models.length) return;
    const controller = new window.AbortController();
    job = controller;
    report = null;
    clear();
    $("print-results").replaceChildren();
    $("print-status").textContent = "Checking on your device…";
    $("print-fields").disabled = true;
    $("print-run").disabled = true;
    $("print-cancel").hidden = false;
    try {
      let profile = null;
      if ($("print-fdm").checked) {
        profile = { technology: "fdm" };
        if ($("print-wall").value)
          profile.min_wall_mm = Number($("print-wall").value);
        if ($("print-angle").value)
          profile.overhang_degrees = Number($("print-angle").value);
        const bed = ["x", "y", "z"].map((a) => $("print-bed-" + a).value);
        if (bed.some(Boolean)) {
          if (!bed.every(Boolean))
            throw new Error(
              "Enter all three build-volume dimensions, or leave all three empty.",
            );
          profile.build_volume_mm = bed.map(Number);
        }
      }
      scopeKey = key();
      for (const id of stateIds()) {
        if (getViewer().get_model_animation_state(id)?.status === "running") {
          getViewer().pause_model_animation(id);
          pausedForCheck.add(id);
        }
      }
      sync();
      const result = await getViewer().check_printability({
        model_ids: stateIds(),
        level: $("print-level").value,
        units_confirmed: $("print-units").checked,
        profile,
        signal: controller.signal,
        on_progress: (p) => {
          if (job === controller)
            $("print-status").textContent =
              `${p.phase} · model ${(p.model_index ?? 0) + 1} of ${p.total_models}`;
        },
      });
      if (disposed || controller.signal.aborted) return;
      report = result;
      render(report);
      $("print-status").textContent = summary[report.summary];
      announce(summary[report.summary]);
    } catch (error) {
      if (!disposed)
        $("print-status").textContent =
          error.name === "AbortError"
            ? "Check cancelled. Your model is unchanged."
            : error.message;
    } finally {
      if (job === controller) job = null;
      if (!disposed) {
        $("print-fields").disabled = false;
        $("print-run").disabled = false;
        $("print-cancel").hidden = true;
        sync();
      }
    }
  });
  sync();
  return {
    sync,
    close,
    dispose() {
      disposed = true;
      close(false);
      report = null;
      pausedForCheck.clear();
    },
  };
}
