import { useEffect, useRef } from "react";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x),
      mix(hash(i + vec2(0., 1.)), hash(i + vec2(1.)), f.x), f.y);
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime * .055;
    float grain = noise(uv * 7. + vec2(t, -t));
    float tide = smoothstep(.22, 0., abs(uv.y - (.72 + sin(uv.x * 6. + t) * .045)));
    vec3 blue = vec3(.89, .95, 1.);
    vec3 coral = vec3(1., .29, .16);
    vec3 color = mix(blue, coral, tide * .16);
    float alpha = .035 + grain * .028 + tide * .04;
    gl_FragColor = vec4(color, alpha);
  }
`;

export default function AmbientCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canvas || reduceMotion) return;
    let dispose = () => {};
    let cancelled = false;
    import("../lib/threeAmbient").then((THREE) => {
      if (cancelled) return;
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      const scene = new THREE.Scene();
      const camera = new THREE.Camera();
      const uniforms = { uTime: { value: 0 } };
      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false });
      scene.add(new THREE.Mesh(geometry, material));

      const resize = () => renderer.setSize(innerWidth, innerHeight, false);
      const clock = new THREE.Clock();
      let frame;
      const render = () => {
        uniforms.uTime.value = clock.getElapsedTime();
        renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
      };
      resize();
      render();
      addEventListener("resize", resize);
      dispose = () => {
        cancelAnimationFrame(frame);
        removeEventListener("resize", resize);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      };
    });
    return () => {
      cancelled = true;
      dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="ambient-canvas" aria-hidden="true" />;
}
