import { mergeBookmarks } from "./model-tools.js";
import { sceneFormat, localSceneFile, sceneURL } from "./scene-import.js";
import { assertMemory, MEMORY_OVERHEAD } from "./memory.js";
import { modelMatrix, transform } from "./math.js";

// Called by StlViewer.import_scene. Existing models and view survive failed imports.
export function importScene(source, options = {}) {
  const controller = new AbortController(),
    signal = controller.signal;
  const generation = this._generation,
    ids = [],
    added = new Map(),
    usedFiles = new Set();
  const hadModels = this._models.size > 0;
  let job,
    held = 0,
    oldCamera,
    committed = false,
    callbackError;
  const cancel = () => {
    controller.abort();
    job?.cancel?.();
    for (const [id, m] of added)
      if (this._models.get(id) === m) this.remove_model(id);
  };
  const check = () => {
    if (signal.aborted || generation !== this._generation || this.killsign)
      throw new DOMException("Scene opening cancelled", "AbortError");
  };
  const progress = (value) => options.on_progress?.(value);
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) cancel();
  // clean()/dispose() abort the reader and any partially imported models.
  signal.addEventListener("abort", () => job?.cancel?.(), { once: true });
  this._aborters.add(controller);
  const promise = (async () => {
    await this.when_ready;
    check();
    oldCamera = this.get_camera_state();
    const format =
      options.format ||
      sceneFormat(typeof source === "string" ? source : source.name);
    if (!["vsb", "vsj"].includes(format))
      throw new Error("Choose VSB or VSJ for a scene");
    let remote, relay;
    if (typeof source === "string") {
      remote = sceneURL(source, document.baseURI);
      if (!this.options.url_import_endpoint)
        throw new Error("Configure url_import_endpoint for scene URL imports");
      relay = new URL(this.options.url_import_endpoint, document.baseURI).href;
      if (new URL(relay).origin !== location.origin)
        throw new Error("The URL relay must use the same origin as this page");
    }
    const available = this.limits.max_memory_bytes - this._occupiedMemory();
    assertMemory(
      this.limits,
      this._occupiedMemory() + MEMORY_OVERHEAD,
      "scene opening",
    );
    const limits = {
      ...this.limits,
      max_memory_bytes: available,
      max_file_bytes: Math.min(
        this.limits.max_file_bytes,
        Math.floor((available - MEMORY_OVERHEAD) / 4),
      ),
    };
    held = Math.max(0, available - MEMORY_OVERHEAD);
    this._sceneBytes = (this._sceneBytes || 0) + held;
    job = this._pool.run(
      {
        kind: "read-scene",
        source,
        remote,
        relay,
        format,
        name: `scene.${format}`,
        limits,
      },
      (p) => {
        try {
          progress({ ...p, phase: "reading-scene" });
        } catch (error) {
          callbackError = error;
          job.cancel();
        }
      },
    );
    let documentData;
    try {
      documentData = await job;
    } catch (error) {
      throw callbackError || error;
    }
    job = null;
    check();
    const { scene, files, base } = documentData;
    const bookmarks = mergeBookmarks(
      this.get_camera_bookmarks(),
      scene.camera_bookmarks || [],
    );
    this._sceneBytes -= held;
    held =
      Object.values(files || {}).reduce((n, b) => n + b.byteLength, 0) +
      JSON.stringify(scene).length * 2;
    this._sceneBytes += held;
    const companions = options.files || [],
      missing = [];
    const models = scene.models.map((input) => {
      const model = { ...input };
      if (files)
        model.local_file = new File([files[input.filename]], input.filename);
      else {
        const local = localSceneFile(input.filename, companions);
        if (local) {
          model.local_file = local;
          usedFiles.add(local);
        } else {
          const url = sceneURL(input.filename, remote ? base : undefined);
          if (url) model.remote_url = url;
          else missing.push(input.filename);
        }
      }
      if (model.remote_url && !this.options.url_import_endpoint)
        throw new Error("Scene URL references require a configured URL relay");
      return model;
    });
    if (missing.length)
      throw new Error(
        "Choose the VSJ together with these model files: " +
          missing.slice(0, 8).join(", ") +
          (missing.length > 8 ? "…" : ""),
      );
    if (models.length + this._models.size > this.limits.max_archive_entries)
      throw new Error("Scene model count limit exceeded");
    for (let index = 0; index < models.length; index++) {
      check();
      progress({ phase: "opening-model", loaded: index, total: models.length });
      check();
      const input = models[index],
        id = this.max_model_id + 1;
      this.add_model({ ...input, id, animation: null, animation_state: null });
      const model = this._models.get(id);
      if (!model) throw new Error(this.error || "Invalid scene model");
      ids.push(id);
      added.set(id, model);
      model._sceneImportPending = true;
      await this._pending.get(id);
      check();
      if (this._models.get(id) !== model || !model.geometry)
        throw new Error(this.error || "A scene model could not be opened");
      // Convert centering into an equivalent translation, without changing existing models.
      const desired =
        (scene.center_models ?? this.center_models)
          ? model.geometry.bounds.min.map(
              (v, i) => (v + model.geometry.bounds.max[i]) / 2,
            )
          : [0, 0, 0];
      const delta = model.center.map((v, i) => v - desired[i]);
      const shift = transform(
        modelMatrix({
          ...model,
          x: 0,
          y: 0,
          z: 0,
          center: [0, 0, 0],
          scaleVector: model.scaleVector,
        }),
        delta,
      );
      if (input.animation)
        model.center = [...(input.animation_state?.center ?? desired)];
      else ["x", "y", "z"].forEach((axis, i) => (model[axis] += shift[i]));
      if (
        [...this._models.values()].reduce(
          (n, m) => n + (m.geometry?.triangles || 0),
          0,
        ) > this.limits.max_triangles
      )
        throw new Error("Scene triangle limit exceeded");
    }
    progress({
      phase: "complete",
      loaded: models.length,
      total: models.length,
    });
    check();
    for (let index = 0; index < ids.length; index++) {
      const model = added.get(ids[index]),
        input = models[index];
      if (input.animation)
        this._startAnimation(model, input.animation, input.animation_state);
      model._sceneImportPending = false;
    }
    if (scene.bg_color !== undefined) this.set_bg_color(scene.bg_color);
    if (scene.infinite_grid)
      this.set_infinite_grid(
        true,
        scene.infinite_grid.spacing,
        scene.infinite_grid.height,
      );
    else this.set_grid(!!scene.grid);
    if (scene.auto_rotate !== undefined)
      this.set_auto_rotate(scene.auto_rotate);
    this._restoreCamera = scene.camera_state || (hadModels ? oldCamera : null);
    this.camera_bookmarks = bookmarks;
    if (scene.display_units) this.display_units = scene.display_units;
    committed = true;
    return { model_ids: ids, scene, used_files: [...usedFiles] };
  })()
    .catch((error) => {
      cancel();
      throw error;
    })
    .finally(() => {
      options.signal?.removeEventListener("abort", cancel);
      this._aborters.delete(controller);
      this._sceneBytes = (this._sceneBytes || 0) - held;
      this._sceneLoads.delete(promise);
      if (generation === this._generation && !this.killsign) {
        if (!committed && oldCamera) this._restoreCamera = oldCamera;
        this._finishSession();
      }
    });
  this._sessionActive = true;
  this._sceneLoads.add(promise);
  return promise;
}
