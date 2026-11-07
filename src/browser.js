import { mountViewstlApp } from "./app.js";
import { StlViewer } from "./viewer.js";
const script = globalThis.document?.currentScript;
StlViewer.workerURL = new URL(
  "viewstl.worker.js",
  script?.src || document.baseURI,
).href;
globalThis.StlViewer = StlViewer;

globalThis.mountViewstlApp = mountViewstlApp;
