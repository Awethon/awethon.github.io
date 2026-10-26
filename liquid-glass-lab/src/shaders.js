export const VERT = `#version 300 es
const vec2 P[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() { gl_Position = vec4(P[gl_VertexID], 0.0, 1.0); }`;

export const SCENE = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform int uBg;
uniform sampler2D uPage;
uniform vec2 uPageSize;
uniform float uScroll;
out vec4 o;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

vec3 palette(float k) {
  int i = int(floor(k * 6.0));
  if (i == 0) return vec3(1.0, 0.45, 0.36);
  if (i == 1) return vec3(1.0, 0.76, 0.32);
  if (i == 2) return vec3(0.36, 0.88, 0.7);
  if (i == 3) return vec3(0.36, 0.64, 1.0);
  if (i == 4) return vec3(0.68, 0.52, 1.0);
  return vec3(0.93, 0.91, 0.86);
}

float stripes(float s, float spacing, float width, float aa) {
  float d = abs(fract(s / spacing) - 0.5) * spacing;
  return 1.0 - smoothstep(width * 0.5 - aa, width * 0.5 + aa, d);
}

vec3 lines(vec2 p) {
  float cell = 210.0;
  vec2 g = p / cell;
  vec2 i = floor(g);
  vec2 f = fract(g);
  float best = 1e9;
  float second = 1e9;
  vec2 id = vec2(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 r = o + 0.1 + hash2(i + o) * 0.8 - f;
      float d = dot(r, r);
      if (d < best) { second = best; best = d; id = i + o; }
      else if (d < second) second = d;
    }
  }
  vec2 h = hash2(id * 1.37 + 4.1);
  vec2 h2 = hash2(id * 2.71 + 9.3);
  float ang = h.x * 3.14159;
  vec2 dir = vec2(cos(ang), sin(ang));
  float spacing = mix(10.0, 22.0, h.y);
  float width = mix(1.1, 2.6, h2.x);
  float aa = 0.8 / uDpr;
  float a = stripes(dot(p, dir), spacing, width, aa);
  vec3 base = vec3(0.03, 0.035, 0.055) + 0.025 * h2.y;
  vec3 ink = palette(h2.y) * mix(0.62, 0.9, h.y);
  vec3 c = mix(base, ink, a * 0.78);
  float seam = (sqrt(second) - sqrt(best)) * cell;
  c = mix(base * 0.5, c, smoothstep(1.5, 4.0, seam));
  vec2 uv = p / (uRes / uDpr);
  c *= 1.0 - 0.35 * dot(uv - 0.5, uv - 0.5);
  return c;
}

vec3 grid(vec2 p, vec2 size) {
  vec2 uv = p / size;
  vec3 c = mix(vec3(0.94, 0.94, 0.955), vec3(0.62, 0.64, 0.69), smoothstep(0.1, 1.2, uv.x * 0.6 + uv.y * 0.7));
  float aa = 0.8 / uDpr;
  float minor = max(stripes(p.x, 32.0, 1.0, aa), stripes(p.y, 32.0, 1.0, aa));
  float major = max(stripes(p.x, 128.0, 1.6, aa), stripes(p.y, 128.0, 1.6, aa));
  c = mix(c, vec3(0.2, 0.21, 0.25), minor * 0.18);
  return mix(c, vec3(0.13, 0.14, 0.17), major * 0.6);
}

vec3 rings(vec2 p, vec2 size) {
  vec2 c0 = size * vec2(0.36, 0.52);
  vec2 q = p - c0;
  float r = length(q);
  float aa = 0.8 / uDpr;
  float ring = stripes(r, 16.0, 2.0, aa);
  float spoke = stripes(atan(q.y, q.x) * r, 3.14159 * r / 18.0, 1.2, aa) * smoothstep(40.0, 120.0, r);
  vec3 hue = 0.55 + 0.45 * cos(6.2831 * (r / 900.0 + vec3(0.0, 0.33, 0.67)));
  vec3 c = vec3(0.03, 0.03, 0.05);
  c = mix(c, hue, ring * 0.9);
  c = mix(c, vec3(0.9), spoke * 0.25);
  return c * (1.0 - 0.3 * smoothstep(300.0, 1100.0, r));
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  vec2 size = uRes / uDpr;
  vec3 c;
  if (uBg == 3) {
    vec2 q = vec2(p.x, p.y + uScroll) * uDpr;
    c = q.y < uPageSize.y ? texture(uPage, q / uPageSize).rgb : vec3(0.09, 0.09, 0.105);
  } else {
    c = uBg == 0 ? lines(p) : uBg == 1 ? grid(p, size) : rings(p, size);
  }
  o = vec4(c, 1.0);
}`;

export const BLUR = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uDst;
uniform vec2 uStep;
uniform float uLod;
out vec4 o;
void main() {
  vec2 uv = gl_FragCoord.xy / uDst;
  vec3 a = vec3(0.0);
  float ws = 0.0;
  for (int i = -16; i <= 16; i++) {
    float x = float(i);
    float w = exp(-x * x / 56.9);
    a += textureLod(uSrc, uv + uStep * x, uLod).rgb * w;
    ws += w;
  }
  o = vec4(a / ws, 1.0);
}`;

export const GLASS = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBlur;
uniform vec2 uRes;
uniform float uDpr;
uniform vec4 uCap;
uniform float uCapR;
uniform vec4 uCapT;
uniform float uCapE;
uniform vec3 uBtn;
uniform vec4 uBtnT;
uniform float uBtnE;
uniform float uPersp;
uniform int uBlobN;
uniform vec4 uBounds;
uniform vec3 uBlobs[8];
uniform float uBtnOn;
uniform float uMerge;
uniform float uThick;
uniform float uIor;
uniform float uDisp;
uniform float uFrost;
uniform float uBevel;
uniform float uLens;
uniform float uCurve;
uniform float uBody;
uniform float uCut;
uniform float uStudio;
uniform float uFlip;
uniform vec3 uLight;
uniform float uSpec;
uniform float uShin;
uniform float uRefl;
uniform float uIrid;
uniform float uRim;
uniform float uRimDir;
uniform float uShadow;
uniform vec2 uShadowOff;
uniform float uShadowBlur;
uniform float uCaustic;
uniform vec4 uTint;
uniform float uSat;
out vec4 o;

float sdRound(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float smin(float a, float b, float k) {
  if (k <= 0.0) return min(a, b);
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

vec3 tipped(vec2 q, vec4 T, float e) {
  if (T.w < 1e-4) return vec3(q, 0.0);
  vec2 d = T.xy;
  vec2 side = vec2(-d.y, d.x);
  float s = dot(q, d);
  float u = uPersp * (e - s) / max(T.z * uPersp + (e - s) * T.w, 1e-3);
  float k = uPersp / max(uPersp - u * T.w, 1e-3);
  return vec3(d * (e - u) + side * (dot(q, side) / k), u * T.w);
}

vec3 capLocal(vec2 p) { return tipped(p - uCap.xy, uCapT, uCapE); }
vec3 btnLocal(vec2 p) { return tipped(p - uBtn.xy, uBtnT, uBtnE); }

float others(vec2 p) {
  float b = 1e5;
  for (int i = 0; i < 8; i++) {
    if (i >= uBlobN) break;
    float c = length(p - uBlobs[i].xy) - uBlobs[i].z;
    b = b > 1e4 ? c : smin(b, c, uMerge);
  }
  if (uBtnOn > 0.5) {
    float c = length(btnLocal(p).xy) - uBtn.z;
    b = b > 1e4 ? c : smin(b, c, uMerge);
  }
  return b;
}

float sdf(vec2 p) {
  float a = sdRound(capLocal(p).xy, uCap.zw, uCapR);
  float b = others(p);
  return b > 1e4 ? a : smin(a, b, uMerge);
}

vec2 toUv(vec2 q) { return vec2(q.x, uRes.y - q.y) / uRes; }

vec3 sceneAt(vec2 q) {
  vec2 uv = toUv(q);
  return mix(textureLod(uScene, uv, 0.0).rgb, textureLod(uBlur, uv, 0.0).rgb, uFrost);
}

vec2 floorLight(vec2 q) {
  float ds = sdf(q - uShadowOff);
  float sh = uShadow * (1.0 - smoothstep(-uShadowBlur * 0.5, uShadowBlur, ds));
  if (uCaustic < 0.001) return vec2(sh, 0.0);
  float dc = sdf(q - uShadowOff * 0.55);
  float bev = max(uBevel, 2.0 * uDpr);
  float ring = exp(-pow((dc + bev * 0.45) / (bev * 0.28 + uDpr), 2.0));
  float core = smoothstep(0.0, -bev * 1.5, dc) * 0.35;
  return vec2(sh, uCaustic * (ring + core));
}

vec3 lit(vec3 c, vec2 fl) { return c * (1.0 - fl.x) + fl.y * (c * 0.9 + vec3(0.1)); }

vec3 spectral(float w) {
  return clamp(vec3(1.0 - 2.2 * abs(w - 0.08), 1.0 - 2.2 * abs(w - 0.5), 1.0 - 2.2 * abs(w - 0.92)), 0.0, 1.0);
}

float shoulder(float v) {
  return pow(max(1.0 - pow(1.0 - v, uCurve), 0.0), 1.0 / uCurve);
}

float profile(float t) {
  float v = clamp(t / max(uBevel, 1.0), 0.0, 1.0);
  float f;
  if (uCut >= 0.0) {
    float s0 = shoulder(uCut);
    f = (shoulder(uCut + (1.0 - uCut) * v) - s0) / max(1.0 - s0, 1e-3);
  } else {
    f = -uCut + (1.0 + uCut) * shoulder(v);
  }
  float L = 46.0 * uDpr;
  return uThick * f + uLens * uThick * (1.0 - exp(-t / L));
}

float depthDome(float t, float r) {
  float u = 1.0 - clamp(t / max(r, 1.0), 0.0, 1.0);
  return sqrt(max(1.0 - u * u, 0.0));
}

vec2 othersWithRadius(vec2 q) {
  float k = max(uMerge * 0.25, uDpr);
  float b = 1e5;
  float ws = 0.0;
  float acc = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= uBlobN) break;
    float c = length(q - uBlobs[i].xy) - uBlobs[i].z;
    b = b > 1e4 ? c : smin(b, c, uMerge);
    float w = exp(-c / k);
    ws += w;
    acc += w * uBlobs[i].z;
  }
  if (uBtnOn > 0.5) {
    float c = length(btnLocal(q).xy) - uBtn.z;
    b = b > 1e4 ? c : smin(b, c, uMerge);
    float w = exp(-c / k);
    ws += w;
    acc += w * uBtn.z;
  }
  return vec2(b, acc / max(ws, 1e-6));
}

float heightAt(vec2 q) {
  vec3 cl = capLocal(q);
  float d = sdRound(cl.xy, uCap.zw, uCapR);
  float share = 0.0;
  vec2 ob = othersWithRadius(q);
  float b = ob.x;
  if (b < 1e4) {
    share = smoothstep(-1.0, 1.0, (d - b) / max(uMerge, uDpr));
    d = smin(d, b, uMerge);
  }
  if (d > 0.0) return 0.0;
  float t = -d;
  float oval = depthDome(t, min(uCap.z, uCap.w));
  if (abs(uCap.z - uCap.w) >= 1.0) {
    float x = uCap.z > uCap.w ? cl.x / uCap.z : cl.y / uCap.w;
    float along = sqrt(max(1.0 - x * x, 0.0));
    oval *= mix(along, 1.0, smoothstep(0.0, 0.5, share));
  }
  if (share > 0.0) oval = mix(oval, depthDome(t, ob.y), share);
  return profile(t) * mix(1.0, oval, uBody);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  if (any(lessThan(p, uBounds.xy)) || any(greaterThan(p, uBounds.zw))) {
    o = vec4(textureLod(uScene, toUv(p), 0.0).rgb, 1.0);
    return;
  }
  float d = sdf(p);
  if (d > 2.0) {
    vec2 uv = toUv(p);
    o = vec4(lit(textureLod(uScene, uv, 0.0).rgb, floorLight(p)), 1.0);
    return;
  }

  float t = max(-d, 0.0);
  float h = heightAt(p);
  float sigma = max(0.75 * uDpr, 0.45 * t);
  vec2 gh = vec2(0.0);
  float norm = 0.0;
  for (int k = 0; k < 3; k++) {
    float r = sigma * (0.55 + 0.75 * float(k));
    float w = r * exp(-0.5 * r * r / (sigma * sigma));
    vec2 acc = vec2(0.0);
    for (int i = 0; i < 6; i++) {
      float a = (float(i) + 0.5 * float(k)) * 1.047198;
      vec2 dir = vec2(cos(a), sin(a));
      acc += heightAt(p + dir * r) * dir;
    }
    gh += w * acc;
    norm += w * 3.0 * r;
  }
  gh /= norm;
  float slope = length(gh);
  vec3 cl = capLocal(p);
  float share = 0.0;
  float lift = cl.z;
  vec2 tilt = uCapT.xy * uCapT.w / max(uCapT.z, 0.2);
  float ob = others(p);
  if (ob < 1e4) {
    float a = sdRound(cl.xy, uCap.zw, uCapR);
    share = smoothstep(-1.0, 1.0, (a - ob) / max(uMerge, uDpr));
    vec3 bl = uBtnOn > 0.5 ? btnLocal(p) : vec3(0.0);
    vec2 otherTilt = uBtnOn > 0.5 ? uBtnT.xy * uBtnT.w / max(uBtnT.z, 0.2) : vec2(0.0);
    lift = mix(cl.z, bl.z, share);
    tilt = mix(tilt, otherTilt, share);
  }
  vec3 n = normalize(vec3(-gh + tilt, 1.0));
  h += lift;
  float ge = 1.5 * uDpr;
  vec2 gn = vec2(sdf(p + vec2(ge, 0)) - sdf(p - vec2(ge, 0)), sdf(p + vec2(0, ge)) - sdf(p - vec2(0, ge)));
  gn /= max(length(gn), 1e-5);
  vec3 I = vec3(0.0, 0.0, -1.0);

  int N = uDisp > 0.001 ? 7 : 1;
  vec3 acc = vec3(0.0);
  vec3 wsum = vec3(0.0);
  vec2 q0 = p;
  for (int i = 0; i < 7; i++) {
    if (i >= N) break;
    float w = N == 1 ? 0.5 : float(i) / float(N - 1);
    float ior = uIor + uDisp * (w - 0.5) * 2.0;
    vec3 T = refract(I, n, 1.0 / ior);
    vec2 q = p + T.xy / max(-T.z, 0.25) * h * uFlip;
    if (i == N / 2) q0 = q;
    vec3 wt = N == 1 ? vec3(1.0) : spectral(w);
    acc += sceneAt(q) * wt;
    wsum += wt;
  }
  vec3 col = acc / wsum;
  vec2 fl = floorLight(q0);
  col = lit(col, vec2(fl.x * 0.3, fl.y));

  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(luma), col, uSat), 0.0);
  col = mix(col, uTint.rgb, uTint.a);

  vec2 L2 = normalize(uLight.xy + 1e-5);
  float edge = length(n.xy);
  col *= 1.0 - 0.45 * smoothstep(0.8, 0.99, edge) * min(uThick / (30.0 * uDpr), 1.0);

  float F0 = pow((uIor - 1.0) / (uIor + 1.0), 2.0);
  float F = F0 + (1.0 - F0) * pow(1.0 - n.z, 5.0);
  vec3 R = reflect(I, n);
  float studio = 0.12 + 0.95 * pow(max(dot(normalize(R), uLight), 0.0), 3.0);
  vec3 around = textureLod(uBlur, toUv(p - R.xy * 50.0 * uDpr), 2.0).rgb;
  vec3 env = mix(vec3(0.015), mix(around * 1.15, vec3(studio), 0.55), uStudio);
  col = mix(col, env, clamp(F * uRefl * 1.6, 0.0, 1.0));

  float film = uIrid * (F * 2.5 + 0.35 * smoothstep(uBevel, 0.0, t));
  vec3 thin = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + h / max(uThick, 1.0) * 1.6 + dot(gn, L2) * 0.45 + slope * 0.12));
  col += thin * film * 0.55;

  vec3 V = vec3(0.0, 0.0, 1.0);
  float nh = max(dot(n, normalize(uLight + V)), 0.0);
  float sp = pow(nh, uShin) + 0.12 * pow(nh, uShin * 0.12) * smoothstep(0.05, 0.4, length(n.xy));
  vec3 Lb = normalize(vec3(-uLight.xy, uLight.z));
  sp += 0.4 * pow(max(dot(n, normalize(Lb + V)), 0.0), uShin);
  col += sp * uSpec;

  float rimW = exp(-t / (0.9 * uDpr));
  float dir = mix(1.0, 0.2 + 0.8 * pow(abs(dot(gn, L2)), 1.5), uRimDir);
  col += rimW * dir * uRim * vec3(1.0);

  vec3 outside = lit(textureLod(uScene, toUv(p), 0.0).rgb, floorLight(p));
  float de = 0.75;
  float ex = sdf(p + vec2(de, 0)) - sdf(p - vec2(de, 0));
  float ey = sdf(p + vec2(0, de)) - sdf(p - vec2(0, de));
  float dist = d / max(length(vec2(ex, ey)) / (2.0 * de), 0.2);
  o = vec4(mix(outside, col, smoothstep(0.75, -0.75, dist)), 1.0);
}`;
