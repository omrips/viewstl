import { StlViewer } from "./viewer.js";
StlViewer.workerURL = new URL("./viewstl.worker.js", import.meta.url).href;
export { StlViewer };
export default StlViewer;

export { ViewerSession } from "./session.js";
