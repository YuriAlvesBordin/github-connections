/**
 * Stores the GLSL program sources. Nodes render as instanced quads with
 * signed distance circles, atlas images and state rings. Edges render as
 * instanced quads bent along a quadratic bezier defined by per link
 * curvature, with dashes measured along the true curve arc length.
 */
export const NODE_VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 aNode;
layout(location=2) in vec4 aFill;
layout(location=3) in vec4 aBorder;
layout(location=4) in vec4 aStyle;
layout(location=5) in vec4 aImage;
uniform mat3 uCamera;
out vec2 vLocal;
out vec2 vAtlasUv;
out vec4 vFill;
out vec4 vBorder;
out vec4 vStyle;
flat out float vImageActive;
void main() {
  vec2 world = aNode.xy + aCorner * aNode.w;
  gl_Position = vec4((uCamera * vec3(world, 1.0)).xy, 0.0, 1.0);
  vLocal = aCorner;
  vAtlasUv = (aCorner * 0.5 + 0.5 + vec2(mod(aImage.x, 8.0), floor(aImage.x / 8.0))) / 8.0;
  vFill = aFill;
  vBorder = aBorder;
  vStyle = aStyle;
  vImageActive = aImage.y;
}`;
export const NODE_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vLocal;
in vec2 vAtlasUv;
in vec4 vFill;
in vec4 vBorder;
in vec4 vStyle;
flat in float vImageActive;
uniform sampler2D uAtlas;
uniform float uZoom;
uniform vec4 uHoverRing;
uniform vec4 uSelectedRing;
uniform vec4 uFixedRing;
uniform float uHoverRingWidth;
uniform float uSelectedRingWidth;
uniform float uFixedRingWidth;
uniform float uDisabledOpacity;
out vec4 outColor;
float band(float d, float inner, float outer, float aa) {
  return smoothstep(inner - aa, inner + aa, d) * (1.0 - smoothstep(outer - aa, outer + aa, d));
}
void main() {
  float d = length(vLocal);
  float aa = max(fwidth(d), 0.0008);
  float discRadius = vStyle.x / max(vStyle.w, 0.0001);
  float discAlpha = 1.0 - smoothstep(discRadius - aa, discRadius + aa, d);
  int state = int(vStyle.z + 0.5);
  vec4 ringColor = vec4(0.0);
  float ringWidth = 0.0;
  if (state == 1) { ringColor = uHoverRing; ringWidth = uHoverRingWidth; }
  else if (state == 2 || state == 3) { ringColor = uSelectedRing; ringWidth = uSelectedRingWidth; }
  else if (state == 4) { ringColor = uFixedRing; ringWidth = uFixedRingWidth; }
  float ringOuter = discRadius + ringWidth / max(uZoom * vStyle.w, 0.0001);
  float ring = ringWidth > 0.0 ? band(d, discRadius, ringOuter, aa) : 0.0;
  if (discAlpha <= 0.0 && ring <= 0.0) discard;
  vec4 fill = vFill;
  if (vImageActive > 0.5) {
    vec4 image = texture(uAtlas, vAtlasUv);
    fill.rgb = mix(fill.rgb, image.rgb, image.a);
  }
  float borderSize = vStyle.y / max(uZoom * vStyle.w, 0.0001);
  float border = vStyle.y > 0.0 ? band(d, max(0.0, discRadius - borderSize), discRadius, aa) : 0.0;
  vec4 core = mix(fill, vec4(vBorder.rgb, vBorder.a * vStyle.y), border);
  core.a *= discAlpha * (state == 5 ? uDisabledOpacity : 1.0);
  vec4 halo = vec4(ringColor.rgb, ringColor.a * ring);
  outColor = vec4(mix(halo.rgb, core.rgb, core.a), core.a + halo.a * (1.0 - core.a));
}`;
export const EDGE_VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 aSegment;
layout(location=2) in vec4 aColor;
layout(location=3) in vec4 aStyle;
layout(location=4) in vec4 aMeta;
uniform mat3 uCamera;
uniform float uZoom;
out float vSide;
out float vDashPosition;
out vec4 vColor;
out vec2 vDashPattern;
flat out float vDashed;
void main() {
  vec2 p0 = aSegment.xy;
  vec2 p1 = aSegment.zw;
  vec2 chord = p1 - p0;
  float chordLength = max(length(chord), 0.00001);
  float curvature = aMeta.x;
  vec2 mid = (p0 + p1) * 0.5;
  vec2 control = mid + vec2(-chord.y, chord.x) / chordLength * (curvature * chordLength * 0.35);
  float t = (aCorner.x + 1.0) * 0.5;
  float u = 1.0 - t;
  vec2 point = u * u * p0 + 2.0 * u * t * control + t * t * p1;
  vec2 tangent = 2.0 * u * (control - p0) + 2.0 * t * (p1 - control);
  float tangentLength = max(length(tangent), 0.00001);
  vec2 normal = vec2(-tangent.y, tangent.x) / tangentLength;
  float widthWorld = aStyle.x / max(uZoom, 0.0001);
  vec2 world = point + normal * aCorner.y * widthWorld * 0.5;
  gl_Position = vec4((uCamera * vec3(world, 1.0)).xy, 0.0, 1.0);
  vSide = aCorner.y;
  float dashScale = aMeta.z > 0.5 ? 1.0 : uZoom;
  vDashPosition = (t * aMeta.w) * dashScale + aStyle.w;
  vColor = aColor;
  vDashPattern = aStyle.yz;
  vDashed = aMeta.y;
}`;
export const EDGE_FRAGMENT = `#version 300 es
precision highp float;
in float vSide;
in float vDashPosition;
in vec4 vColor;
in vec2 vDashPattern;
flat in float vDashed;
out vec4 outColor;
void main() {
  float edgeAA = max(fwidth(vSide), 0.002);
  float alpha = 1.0 - smoothstep(1.0 - edgeAA, 1.0 + edgeAA, abs(vSide));
  if (vDashed > 0.5) {
    float cycle = max(0.5, vDashPattern.x + vDashPattern.y);
    float phase = mod(vDashPosition, cycle);
    float dashAA = max(fwidth(vDashPosition), 0.3);
    alpha *= 1.0 - smoothstep(vDashPattern.x - dashAA, vDashPattern.x + dashAA, phase);
  }
  if (alpha <= 0.0) discard;
  outColor = vec4(vColor.rgb, vColor.a * alpha);
}`;
export const ARROW_VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 aArrow;
layout(location=2) in vec4 aColor;
layout(location=3) in float aHalfWidth;
uniform mat3 uCamera;
out vec2 vLocal;
flat out float vLength;
flat out float vHalfWidth;
out vec4 vColor;
void main() {
  vec2 base = aArrow.xy;
  vec2 tip = aArrow.zw;
  vec2 direction = tip - base;
  float worldLength = max(length(direction), 0.00001);
  vec2 dirNorm = direction / worldLength;
  vec2 normal = vec2(-dirNorm.y, dirNorm.x);
  float t = (aCorner.x + 1.0) * 0.5;
  vec2 world = base + dirNorm * (t * worldLength) + normal * aCorner.y * aHalfWidth * (1.0 - t);
  gl_Position = vec4((uCamera * vec3(world, 1.0)).xy, 0.0, 1.0);
  vLocal = vec2(t * worldLength, aCorner.y * aHalfWidth * (1.0 - t));
  vLength = worldLength;
  vHalfWidth = aHalfWidth;
  vColor = aColor;
}`;
export const ARROW_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vLocal;
flat in float vLength;
flat in float vHalfWidth;
in vec4 vColor;
out vec4 outColor;
void main() {
  float u = vLocal.x;
  float v = vLocal.y;
  float L = vLength;
  float W = vHalfWidth;
  if (L <= 0.00001) discard;
  float dEdges = (W * L - W * u - abs(v) * L) / length(vec2(L, W));
  float d = min(u, dEdges);
  float aa = max(fwidth(d), 0.002);
  float alpha = smoothstep(-aa, aa, d);
  if (alpha <= 0.0) discard;
  outColor = vec4(vColor.rgb, vColor.a * alpha);
}`;
//# sourceMappingURL=shaders.js.map