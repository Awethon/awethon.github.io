import { VERT, SCENE, BLUR, GLASS } from './shaders.js';

export const PERSPECTIVE = 750;
const BACKDROPS = { lines: 0, grid: 1, rings: 2, page: 3 };

export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false });
  if (!gl) return null;

  function compile(fragment) {
    const program = gl.createProgram();
    for (const [type, source] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, fragment]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    const u = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      u[info.name] = gl.getUniformLocation(program, info.name);
    }
    return { program, u };
  }

  const programs = { scene: compile(SCENE), blur: compile(BLUR), glass: compile(GLASS) };
  gl.bindVertexArray(gl.createVertexArray());

  function target(width, height, mips) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (mips) gl.generateMipmap(gl.TEXTURE_2D);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fbo, width, height };
  }

  function release(t) {
    if (!t) return;
    gl.deleteTexture(t.tex);
    gl.deleteFramebuffer(t.fbo);
  }

  let W = 0;
  let H = 0;
  let dpr = 1;
  let scene = null;
  let sceneKey = '';
  let blur = null;
  let blurKey = '';
  let page = null;
  let pageSize = [1, 1];
  let pageVersion = 0;

  function setPage(source) {
    if (!page) page = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, page);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    pageSize = [source.width, source.height];
    pageVersion++;
  }

  function resize(width, height, ratio) {
    dpr = ratio;
    W = Math.round(width * ratio);
    H = Math.round(height * ratio);
    canvas.width = W;
    canvas.height = H;
    release(scene);
    scene = target(W, H, true);
    sceneKey = '';
  }

  function drawScene(backdrop, scroll) {
    const key = backdrop === 'page' ? `page|${W}|${H}|${scroll}|${pageVersion}` : `${backdrop}|${W}|${H}`;
    if (key === sceneKey) return false;
    sceneKey = key;
    const { program, u } = programs.scene;
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fbo);
    gl.viewport(0, 0, W, H);
    gl.useProgram(program);
    gl.uniform2f(u.uRes, W, H);
    gl.uniform1f(u.uDpr, dpr);
    gl.uniform1i(u.uBg, page || backdrop !== 'page' ? BACKDROPS[backdrop] ?? 0 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, page);
    gl.uniform1i(u.uPage, 0);
    gl.uniform2f(u.uPageSize, pageSize[0], pageSize[1]);
    gl.uniform1f(u.uScroll, scroll);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindTexture(gl.TEXTURE_2D, scene.tex);
    gl.generateMipmap(gl.TEXTURE_2D);
    return true;
  }

  function blurred(frost) {
    const sigma = frost * dpr;
    if (sigma < 0.5) return scene.tex;
    const scale = sigma < 14 ? 2 : 4;
    const w = Math.ceil(W / scale);
    const h = Math.ceil(H / scale);
    if (!blur || blur.scale !== scale || blur.h.width !== w || blur.h.height !== h) {
      release(blur?.h);
      release(blur?.v);
      blur = { scale, h: target(w, h, true), v: target(w, h, false) };
      blurKey = '';
    }
    const key = `${sigma}|${sceneKey}`;
    if (key === blurKey) return blur.v.tex;
    blurKey = key;
    const stepPx = (3 * sigma) / 16;
    const { program, u } = programs.blur;
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(u.uSrc, 0);
    gl.viewport(0, 0, w, h);
    gl.uniform2f(u.uDst, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, blur.h.fbo);
    gl.bindTexture(gl.TEXTURE_2D, scene.tex);
    gl.uniform2f(u.uStep, stepPx / W, 0);
    gl.uniform1f(u.uLod, Math.log2(Math.max(stepPx, 1)));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindTexture(gl.TEXTURE_2D, blur.h.tex);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindFramebuffer(gl.FRAMEBUFFER, blur.v.fbo);
    gl.uniform2f(u.uStep, 0, stepPx / H);
    gl.uniform1f(u.uLod, Math.log2(Math.max(stepPx / scale, 1)));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return blur.v.tex;
  }

  function render(frame) {
    const { p, backdrop, scroll, light, shape, drop, main, second, mainTip, dropTip, tint, blobs } = frame;
    drawScene(backdrop, scroll);
    const blurTex = blurred(p.frost);
    const { program, u } = programs.glass;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, scene.tex);
    gl.uniform1i(u.uScene, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, blurTex);
    gl.uniform1i(u.uBlur, 1);
    gl.uniform2f(u.uRes, W, H);
    gl.uniform1f(u.uDpr, dpr);
    gl.uniform4f(u.uCap, main.x * dpr, main.y * dpr, shape.hw * dpr, shape.hh * dpr);
    gl.uniform1f(u.uCapR, shape.r * dpr);
    gl.uniform4f(u.uCapT, mainTip.dx, mainTip.dy, Math.cos(mainTip.angle), Math.sin(mainTip.angle));
    gl.uniform1f(u.uCapE, mainTip.e * dpr);
    gl.uniform1f(u.uPersp, PERSPECTIVE * dpr);
    gl.uniform3f(u.uBtn, second.x * dpr, second.y * dpr, shape.dropR * dpr);
    gl.uniform4f(u.uBtnT, dropTip.dx, dropTip.dy, Math.cos(dropTip.angle), Math.sin(dropTip.angle));
    gl.uniform1f(u.uBtnE, dropTip.e * dpr);
    gl.uniform1f(u.uBtnOn, drop ? 1 : 0);
    const margin = p.shadowBlur * 1.5 + p.shadowDist + p.merge + 12;
    const parts = [[main.x, main.y, Math.max(shape.hw, shape.hh) * 1.25], ...(drop ? [[second.x, second.y, shape.dropR * 1.25]] : []), ...blobs.map(b => [b.x, b.y, b.r])];
    const box = parts.reduce((a, [x, y, r]) => [Math.min(a[0], x - r), Math.min(a[1], y - r), Math.max(a[2], x + r), Math.max(a[3], y + r)], [Infinity, Infinity, -Infinity, -Infinity]);
    gl.uniform4f(u.uBounds, (box[0] - margin) * dpr, (box[1] - margin) * dpr, (box[2] + margin) * dpr, (box[3] + margin) * dpr);
    gl.uniform1i(u.uBlobN, blobs.length);
    if (blobs.length) gl.uniform3fv(u['uBlobs[0]'], blobs.flatMap(b => [b.x * dpr, b.y * dpr, b.r * dpr]));
    gl.uniform1f(u.uMerge, p.merge * dpr);
    gl.uniform1f(u.uThick, p.thick * dpr);
    gl.uniform1f(u.uIor, p.ior);
    gl.uniform1f(u.uDisp, p.disp);
    gl.uniform1f(u.uFrost, p.frost > 0.25 ? 1 : 0);
    gl.uniform1f(u.uBevel, p.bevel * dpr);
    gl.uniform1f(u.uLens, p.lens);
    gl.uniform1f(u.uCurve, p.curve);
    gl.uniform1f(u.uBody, p.body);
    gl.uniform1f(u.uCut, p.cut);
    gl.uniform1f(u.uStudio, p.studio);
    gl.uniform1f(u.uFlip, p.flip);
    gl.uniform3f(u.uLight, light[0], light[1], light[2]);
    gl.uniform1f(u.uSpec, p.spec);
    gl.uniform1f(u.uShin, 60);
    gl.uniform1f(u.uRefl, p.refl);
    gl.uniform1f(u.uIrid, p.irid);
    gl.uniform1f(u.uRim, p.rim);
    gl.uniform1f(u.uRimDir, p.rimDir);
    gl.uniform1f(u.uShadow, p.shadow);
    gl.uniform2f(u.uShadowOff, -light[3] * p.shadowDist * dpr, -light[4] * p.shadowDist * dpr);
    gl.uniform1f(u.uShadowBlur, p.shadowBlur * dpr);
    gl.uniform1f(u.uCaustic, p.caustic);
    gl.uniform4f(u.uTint, tint[0], tint[1], tint[2], p.tintA);
    gl.uniform1f(u.uSat, p.sat);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
  }

  return { resize, render, setPage, size: () => ({ W, H, dpr }), maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE) };
}
