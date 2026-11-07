import { inverse } from "./math.js";
import { colorRGB } from "./geometry.js";

const vertex = `#version 300 es
precision highp float;
out vec2 screen;
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);screen=p*2.0-1.0;gl_Position=vec4(screen,0,1);}`;
const fragment = `#version 300 es
precision highp float;
in vec2 screen;
uniform mat4 inverseVP;uniform mat4 vp;uniform vec3 eye;uniform float height;uniform float spacing;uniform vec3 color;
out vec4 result;
float line(vec2 p,float stepSize){vec2 v=p/stepSize;vec2 d=abs(fract(v-0.5)-0.5)/max(fwidth(v),vec2(0.00001));return 1.0-min(min(d.x,d.y),1.0);}
void main(){
 vec4 a=inverseVP*vec4(screen,-1,1),b=inverseVP*vec4(screen,1,1);vec3 nearPoint=a.xyz/a.w,farPoint=b.xyz/b.w;
 vec3 ray=farPoint-nearPoint;if(abs(ray.z)<0.0000001)discard;
 float t=(height-nearPoint.z)/ray.z;if(t<0.0)discard;
 vec3 p=nearPoint+t*ray;vec4 clip=vp*vec4(p,1);if(clip.w<=0.0)discard;
 float pixel=max(length(dFdx(p.xy)),length(dFdy(p.xy)));
 float level=log(max(pixel*50.0/spacing,0.000001))/log(10.0);
 float stepSize=spacing*pow(10.0,floor(level));float mixLevel=smoothstep(0.0,1.0,fract(level));
 float alpha=max(line(p.xy,stepSize)*(1.0-mixLevel)*0.16,line(p.xy,stepSize*10.0)*0.30);
 alpha*=smoothstep(0.015,0.12,abs(ray.z)/length(ray));
 if(alpha<0.003)discard;
 gl_FragDepth=clamp(clip.z/clip.w*0.5+0.5+0.000001,0.0,0.999999);
 result=vec4(color,alpha);
}`;

export class InfiniteGrid {
  constructor(gl) {
    this.gl = gl;
    const shaders = [];
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
          throw Error("Grid shader: " + gl.getShaderInfoLog(shader));
      }
      program = gl.createProgram();
      shaders.forEach((shader) => gl.attachShader(program, shader));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw Error("Grid program: " + gl.getProgramInfoLog(program));
      this.program = program;
      this.vao = gl.createVertexArray();
      if (!this.vao) throw Error("Graphics memory unavailable for grid");
      this.uniforms = Object.fromEntries(
        ["inverseVP", "vp", "eye", "height", "spacing", "color"].map((n) => [
          n,
          gl.getUniformLocation(program, n),
        ]),
      );
    } catch (error) {
      if (program) gl.deleteProgram(program);
      throw error;
    } finally {
      shaders.forEach((shader) => gl.deleteShader(shader));
    }
  }
  draw(vp, camera, grid, background) {
    const gl = this.gl,
      u = this.uniforms;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniformMatrix4fv(u.inverseVP, false, new Float32Array(inverse(vp)));
    gl.uniformMatrix4fv(u.vp, false, new Float32Array(vp));
    gl.uniform3fv(u.eye, camera.position);
    gl.uniform1f(u.height, grid.height);
    gl.uniform1f(u.spacing, grid.spacing);
    const rgb = background === "transparent" ? [1, 1, 1] : colorRGB(background),
      dark = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 < 0.45;
    gl.uniform3fv(u.color, dark ? [0.68, 0.77, 0.81] : [0.37, 0.46, 0.5]);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA,
    );
    gl.depthMask(false);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }
  dispose() {
    this.gl.deleteProgram(this.program);
    this.gl.deleteVertexArray(this.vao);
  }
}
