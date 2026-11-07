import {
  cameraMatrix,
  modelMatrix,
  multiply,
  inverse,
  transform,
  sub,
  dot,
  norm,
} from "./math.js";
import { colorRGB } from "./geometry.js";
import { sectionPlane } from "./appearance.js";
import { InfiniteGrid } from "./infinite-grid.js";
import { selectionFrame } from "./selection-frame.js";
const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec3 position;
layout(location=1) in vec3 normal;
layout(location=2) in vec3 color;
uniform mat4 mvp; uniform mat4 modelMatrix; uniform mat3 normalMatrix;
out vec3 vNormal; out vec3 vColor; out vec3 vPosition; out vec3 vWorld; out vec3 vBary;
void main(){vNormal=normalMatrix*normal;vColor=color;vPosition=position;
vWorld=(modelMatrix*vec4(position,1.0)).xyz;
int corner=gl_VertexID%3;vBary=corner==0?vec3(1,0,0):(corner==1?vec3(0,1,0):vec3(0,0,1));
gl_Position=mvp*vec4(position,1.0);}`;
const fragment = `#version 300 es
precision highp float;
in vec3 vNormal;in vec3 vColor;in vec3 vPosition;in vec3 vWorld;in vec3 vBary;
uniform vec3 tint;uniform vec3 light;uniform float opacity;uniform bool unlit;uniform bool useColors;
uniform vec3 eye;uniform vec4 section;uniform int appearance;
out vec4 result;
void main(){float cut=dot(vec4(vPosition,1.0),section);if(cut>0.0)discard;
vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
float l=unlit?1.0:0.32+0.55*max(dot(n,light),0.0)+0.13*max(dot(n,normalize(vec3(-0.7,-0.3,0.8))),0.0);
vec3 base=tint*(useColors?vColor:vec3(1));vec3 color=base*l;float alpha=opacity;
vec3 view=normalize(eye-vWorld);
if(!unlit){
  if(appearance==1){vec3 w=max(fwidth(vBary),vec3(0.000001));vec3 edge=smoothstep(vec3(0.0),w*1.15,vBary);color=mix(vec3(0.12,0.18,0.21),color,min(min(edge.x,edge.y),edge.z));}
  if(appearance==2){float rim=pow(1.0-abs(dot(n,view)),2.0);color=mix(base*0.7,base, rim);alpha*=0.12+0.28*rim;}
  if(appearance==3){vec3 key=normalize(light+vec3(-0.4,0.5,0.6));float shine=pow(max(dot(n,normalize(key+view)),0.0),36.0);float rim=pow(1.0-max(dot(n,view),0.0),3.0);color=base*(0.45+0.5*max(dot(n,key),0.0))+vec3(0.26)*shine+vec3(0.08)*rim;}
  if(appearance==4)color=(gl_FrontFacing?vec3(0.12,0.55,0.72):vec3(0.9,0.24,0.32))*(0.55+0.45*l);
  if(dot(section.xyz,section.xyz)>0.0 && abs(cut)<max(fwidth(cut)*1.2,0.0000001)){color=vec3(0.93,0.57,0.17);alpha=opacity;}
}
result=vec4(color,alpha);}`;
export class Renderer {
  constructor(canvas, onLost, onRestored, onError) {
    this.canvas = canvas;
    this.domElement = canvas;
    this.resources = new Map();
    this.sharedResources = new WeakMap();
    this.frames = 0;
    this.lost = false;
    this.gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    if (!this.gl)
      throw new Error(
        "WebGL2 is unavailable. Enable browser graphics acceleration or try another browser/device.",
      );
    this.lostHandler = (e) => {
      e.preventDefault();
      this.lost = true;
      this.resources.clear();
      this.sharedResources = new WeakMap();
      this.gridResource = null;
      this.infiniteGrid = null;
      this.selectionResource = null;
      this.diagnosticResource = null;
      onLost();
    };
    this.restoredHandler = () => {
      try {
        this.initialize();
        this.lost = false;
        onRestored();
      } catch (e) {
        onError(e);
      }
    };
    canvas.addEventListener("webglcontextlost", this.lostHandler);
    canvas.addEventListener("webglcontextrestored", this.restoredHandler);
    this.initialize();
  }
  initialize() {
    const gl = this.gl,
      shaders = [];
    let program;
    try {
      for (const [type, source] of [
        [gl.VERTEX_SHADER, vertex],
        [gl.FRAGMENT_SHADER, fragment],
      ]) {
        const shader = gl.createShader(type);
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
          throw new Error(
            `Shader compilation failed: ${gl.getShaderInfoLog(shader)}`,
          );
      }
      program = gl.createProgram();
      for (const shader of shaders) gl.attachShader(program, shader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error(`Shader link failed: ${gl.getProgramInfoLog(program)}`);
      this.program = program;
      this.uniforms = Object.fromEntries(
        [
          "mvp",
          "modelMatrix",
          "normalMatrix",
          "tint",
          "light",
          "eye",
          "opacity",
          "unlit",
          "section",
          "appearance",
          "useColors",
        ].map((n) => [n, gl.getUniformLocation(program, n)]),
      );
    } catch (e) {
      if (program) gl.deleteProgram(program);
      throw e;
    } finally {
      for (const shader of shaders) gl.deleteShader(shader);
    }
  }
  upload(positions, normals, colors) {
    const gl = this.gl,
      vao = gl.createVertexArray(),
      buffers = [];
    if (!vao) throw new Error("Graphics memory is unavailable for this model.");
    gl.bindVertexArray(vao);
    try {
      for (const [location, array] of [
        [0, positions],
        [1, normals],
        [2, colors],
      ])
        if (array) {
          const buffer = gl.createBuffer();
          if (!buffer)
            throw new Error("Graphics memory is unavailable for this model.");
          buffers.push(buffer);
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);
          const error = gl.getError();
          if (error !== gl.NO_ERROR)
            throw new Error(
              error === gl.OUT_OF_MEMORY
                ? "Not enough graphics memory for this model. Try closing other tabs or using another device."
                : "The browser could not upload this model to the graphics device.",
            );
          gl.enableVertexAttribArray(location);
          gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
        }
      gl.bindVertexArray(null);
      return { vao, buffers, count: positions.length / 3 };
    } catch (error) {
      gl.bindVertexArray(null);
      for (const buffer of buffers) gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      throw error;
    }
  }
  free(resource) {
    if (!resource) return;
    for (const buffer of resource.buffers) this.gl.deleteBuffer(buffer);
    this.gl.deleteVertexArray(resource.vao);
  }
  remove(model) {
    if (this.diagnostic?.model === model) this.setDiagnostic(null);
    const resources = this.resources.get(model);
    if (resources)
      for (const resource of Object.values(resources)) {
        if (--resource.users === 0) {
          this.sharedResources.get(resource.source)?.delete(resource);
          this.free(resource);
        }
      }
    this.resources.delete(model);
  }
  clear() {
    this.setDiagnostic(null);
    this.setSelection(null);
    for (const model of this.resources.keys()) this.remove(model);
    this.free(this.gridResource);
    this.gridResource = null;
    this.infiniteGrid?.dispose();
    this.infiniteGrid = null;
  }
  get liveBuffers() {
    let n =
      (this.gridResource?.buffers.length || 0) +
      (this.selectionResource?.buffers.length || 0) +
      (this.diagnosticResource?.buffers.length || 0);
    const unique = new Set();
    for (const r of this.resources.values())
      for (const b of Object.values(r)) unique.add(b);
    for (const b of unique) n += b.buffers.length;
    return n;
  }
  setDiagnostic(value) {
    this.free(this.diagnosticResource);
    this.diagnosticResource = null;
    this.diagnostic = value;
  }
  drawDiagnostic(vp) {
    const gl = this.gl,
      u = this.uniforms,
      d = this.diagnostic,
      m = modelMatrix(d.model);
    this.diagnosticResource ??= this.upload(d.positions);
    gl.uniformMatrix4fv(u.mvp, false, new Float32Array(multiply(vp, m)));
    gl.uniformMatrix4fv(u.modelMatrix, false, new Float32Array(m));
    gl.uniform4fv(u.section, [0, 0, 0, 0]);
    gl.uniform1i(u.appearance, 0);
    gl.uniform1i(u.useColors, 0);
    gl.uniform1i(u.unlit, 1);
    gl.uniform3fv(u.tint, [0.85, 0.16, 0.06]);
    gl.uniform1f(u.opacity, 1);
    gl.bindVertexArray(this.diagnosticResource.vao);
    gl.disable(gl.DEPTH_TEST);
    gl.drawArrays(gl.LINES, 0, this.diagnosticResource.count);
    gl.enable(gl.DEPTH_TEST);
  }
  setSelection(model) {
    if (this.selection === model) return;
    this.free(this.selectionResource);
    this.selectionResource = null;
    this.selection = model;
  }
  drawSelection(vp, background) {
    const gl = this.gl,
      u = this.uniforms,
      matrix = modelMatrix(this.selection);
    this.selectionResource ??= this.upload(
      selectionFrame(this.selection.geometry.bounds),
    );
    gl.uniformMatrix4fv(u.mvp, false, new Float32Array(multiply(vp, matrix)));
    gl.uniformMatrix4fv(u.modelMatrix, false, new Float32Array(matrix));
    gl.uniformMatrix3fv(
      u.normalMatrix,
      false,
      new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
    );
    gl.uniform4fv(u.section, [0, 0, 0, 0]);
    gl.uniform1i(u.appearance, 0);
    gl.uniform1i(u.useColors, 0);
    gl.uniform1i(u.unlit, 1);
    const bg = background === "transparent" ? [1, 1, 1] : colorRGB(background);
    gl.uniform3fv(
      u.tint,
      bg[0] + bg[1] + bg[2] < 1.5 ? [0.42, 0.81, 0.96] : [0.08, 0.43, 0.65],
    );
    gl.bindVertexArray(this.selectionResource.vao);
    // Faint hidden edges keep the box readable when another model occludes it.
    gl.disable(gl.DEPTH_TEST);
    gl.uniform1f(u.opacity, 0.18);
    gl.drawArrays(gl.LINES, 0, this.selectionResource.count);
    gl.enable(gl.DEPTH_TEST);
    gl.uniform1f(u.opacity, 0.9);
    gl.drawArrays(gl.LINES, 0, this.selectionResource.count);
  }
  resource(model, mode) {
    let r = this.resources.get(model);
    if (!r) {
      r = {};
      this.resources.set(model, r);
    }
    if (!r[mode]) {
      const g = model.geometry,
        lines = mode === "edges" || mode === "wire",
        source = lines ? g[mode] : g.positions,
        normals = lines
          ? undefined
          : mode === "smooth"
            ? g.smoothNormals
            : g.normals,
        colors = lines ? undefined : g.colors;
      let entries = this.sharedResources.get(source);
      if (!entries) this.sharedResources.set(source, (entries = new Set()));
      let resource = [...entries].find(
        (r) => r.normals === normals && r.colors === colors,
      );
      if (!resource) {
        resource = Object.assign(this.upload(source, normals, colors), {
          source,
          normals,
          colors,
          users: 0,
        });
        entries.add(resource);
      }
      resource.users++;
      r[mode] = resource;
    }
    return r[mode];
  }
  setGrid(grid) {
    this.grid = grid;
    this.free(this.gridResource);
    this.gridResource = null;
  }
  resize(width, height, pixelRatio = 1) {
    const gl = this.gl,
      max = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    this.canvas.width = Math.min(
      max,
      Math.max(1, Math.round(width * pixelRatio)),
    );
    this.canvas.height = Math.min(
      max,
      Math.max(1, Math.round(height * pixelRatio)),
    );
  }
  draw(models, camera, background, showSelection = true) {
    if (this.lost) return;
    const gl = this.gl,
      u = this.uniforms;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(
      ...(background === "transparent"
        ? [0, 0, 0, 0]
        : [...colorRGB(background), 1]),
    );
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(this.program);
    gl.vertexAttrib3f(1, 0, 0, 1);
    gl.vertexAttrib3f(2, 1, 1, 1);
    gl.uniform3fv(u.light, norm(sub(camera.position, camera.target)));
    gl.uniform3fv(u.eye, camera.position);
    const vp = cameraMatrix(camera, this.canvas.width / this.canvas.height);
    const visible = models.filter(
      (m) => m.geometry && m.opacity > 0 && m.color !== "transparent",
    );
    const distance = (m) => {
      const c = transform(
        modelMatrix(m),
        m.geometry.bounds.min.map((x, i) => (x + m.geometry.bounds.max[i]) / 2),
      );
      const d = sub(c, camera.position);
      return dot(d, d);
    };
    const opaque = visible.filter(
        (m) => m.opacity >= 1 && m.display !== "xray",
      ),
      transparent = visible
        .filter((m) => m.opacity < 1 || m.display === "xray")
        .sort((a, b) => distance(b) - distance(a));
    const draw = (m) => {
      const matrix = modelMatrix(m),
        inv = inverse(matrix),
        g = m.geometry;
      gl.uniformMatrix4fv(u.mvp, false, new Float32Array(multiply(vp, matrix)));
      gl.uniformMatrix4fv(u.modelMatrix, false, new Float32Array(matrix));
      gl.uniform4fv(u.section, sectionPlane(g.bounds, m.section));
      gl.uniform1i(
        u.appearance,
        { mesh: 1, xray: 2, studio: 3, orientation: 4 }[m.display] || 0,
      );
      gl.uniformMatrix3fv(
        u.normalMatrix,
        false,
        new Float32Array([
          inv[0],
          inv[4],
          inv[8],
          inv[1],
          inv[5],
          inv[9],
          inv[2],
          inv[6],
          inv[10],
        ]),
      );
      gl.uniform3fv(
        u.tint,
        m.color && m.color !== "transparent"
          ? colorRGB(m.color)
          : g.colors
            ? [1, 1, 1]
            : colorRGB("#909090"),
      );
      gl.uniform1f(u.opacity, m.opacity);
      gl.uniform1i(u.useColors, +(!m.color && !!g.colors));
      const wire = m.display === "wireframe" && g.wire,
        mode = wire
          ? "wire"
          : (m.smooth_shading || m.display === "smooth") && g.smoothNormals
            ? "smooth"
            : "flat";
      gl.uniform1i(u.unlit, +!!wire);
      const showEdges = m.view_edges || m.display === "edges";
      if (showEdges) {
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(1, 1);
      }
      const r = this.resource(m, mode);
      gl.bindVertexArray(r.vao);
      if (m.display === "xray") {
        // Draw back faces before front faces; no triangle sorting or extra mesh.
        // This is an illustrative translucent view, not exact order-independent transparency.
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        gl.drawArrays(gl.TRIANGLES, 0, r.count);
        gl.cullFace(gl.BACK);
        gl.drawArrays(gl.TRIANGLES, 0, r.count);
        gl.disable(gl.CULL_FACE);
      } else gl.drawArrays(wire ? gl.LINES : gl.TRIANGLES, 0, r.count);
      gl.disable(gl.POLYGON_OFFSET_FILL);
      if (showEdges && g.edges) {
        gl.uniform1i(u.useColors, 0);
        gl.uniform3fv(u.tint, [0.08, 0.09, 0.11]);
        gl.uniform1i(u.unlit, 1);
        const edges = this.resource(m, "edges");
        gl.bindVertexArray(edges.vao);
        gl.drawArrays(gl.LINES, 0, edges.count);
      }
    };
    gl.disable(gl.BLEND);
    for (const model of opaque) draw(model);
    if (this.grid?.infinite) {
      this.infiniteGrid ??= new InfiniteGrid(gl);
      this.infiniteGrid.draw(vp, camera, this.grid, background);
      gl.useProgram(this.program);
    } else if (this.grid) {
      if (!this.gridResource) {
        const { size, divisions } = this.grid,
          lines = [];
        for (let i = 0; i <= divisions; i++) {
          const t = -size / 2 + (size * i) / divisions;
          lines.push(
            -size / 2,
            t,
            0,
            size / 2,
            t,
            0,
            t,
            -size / 2,
            0,
            t,
            size / 2,
            0,
          );
        }
        this.gridResource = this.upload(new Float32Array(lines));
      }
      gl.uniformMatrix4fv(u.mvp, false, new Float32Array(vp));
      gl.uniform4fv(u.section, [0, 0, 0, 0]);
      gl.uniform1i(u.appearance, 0);
      gl.uniform1i(u.useColors, 0);
      gl.uniform3fv(u.tint, [0.7, 0.73, 0.78]);
      gl.uniform1f(u.opacity, 1);
      gl.uniform1i(u.unlit, 1);
      gl.bindVertexArray(this.gridResource.vao);
      gl.drawArrays(gl.LINES, 0, this.gridResource.count);
    }
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA,
    );
    gl.depthMask(false);
    for (const model of transparent) draw(model);
    if (showSelection && this.selection && visible.includes(this.selection))
      this.drawSelection(vp, background);
    if (
      showSelection &&
      this.diagnostic &&
      models.includes(this.diagnostic.model)
    )
      this.drawDiagnostic(vp);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    this.frames++;
  }
  dispose() {
    this.canvas.removeEventListener("webglcontextlost", this.lostHandler);
    this.canvas.removeEventListener(
      "webglcontextrestored",
      this.restoredHandler,
    );
    this.clear();
    this.gl.deleteProgram(this.program);
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
