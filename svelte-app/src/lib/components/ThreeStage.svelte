<script lang="ts">
  // @ts-nocheck
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import * as THREE from 'three';

  let container: HTMLDivElement;
  let renderer: THREE.WebGLRenderer;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let raf = 0;
  let resizeObs: ResizeObserver | null = null;
  const dispatch = createEventDispatcher();

  // 親へ渡すAPI（オプショナル）
  export let onReady: (api: any) => void = () => {};
  let segTex: THREE.CanvasTexture | null = null;
  function setSegCanvas(cnv: HTMLCanvasElement) {
    if (!scene) return;
    if (segTex && (segTex.image as any) === cnv) return; // 同じCanvasなら再生成しない
    segTex?.dispose();
    segTex = new THREE.CanvasTexture(cnv);
    segTex.colorSpace = THREE.SRGBColorSpace;
    segTex.needsUpdate = true;
    scene.background = segTex;
  }
  function updatePlayerAvatar(_pose: any) { /* 将来的なアバター制御 */ }
  function updateHandLandmarks(_hands: any) { /* 将来的なハンド演出 */ }

  // 簡易ステージ（床＋ライト＋漂うライト等）
  onMount(() => {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x090A0F, 10, 100);

    camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    camera.position.set(0, 3.2, 8);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 床
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.8, metalness: 0.2 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.5;
    floor.receiveShadow = true;
    scene.add(floor);

    // ステージ縁のグロー（簡易）
    const ringGeo = new THREE.TorusGeometry(3.2, 0.05, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x39C5BB });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.2;
    scene.add(ring);

    // 照明
    const ambient = new THREE.AmbientLight(0x406060, 0.7);
    scene.add(ambient);

    const key = new THREE.SpotLight(0x39C5BB, 1.1, 40, Math.PI / 6, 0.45, 1.5);
    key.position.set(4, 8, 6);
    scene.add(key);

    const fill = new THREE.SpotLight(0x4050ff, 0.6, 40, Math.PI / 6, 0.45, 1.5);
    fill.position.set(-5, 7, 5);
    scene.add(fill);

    const back = new THREE.DirectionalLight(0xffffff, 0.35);
    back.position.set(0, 6, -6);
    scene.add(back);

    // 観客ペンライト（粒）
    const crowd = new THREE.Group();
    const dotGeo = new THREE.SphereGeometry(0.02, 6, 6);
    const colors = [0x39C5BB, 0x55DDFF, 0x66FFCC, 0xFF69B4];
    for (let i = 0; i < 600; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: colors[(Math.random() * colors.length) | 0] });
      const dot = new THREE.Mesh(dotGeo, mat);
      const r = 3 + Math.random() * 16;
      const a = Math.random() * Math.PI * 2;
      dot.position.set(Math.cos(a) * r, -1.2 + Math.random() * 0.6, Math.sin(a) * r);
      crowd.add(dot);
    }
    scene.add(crowd);

    // アニメーション
    const clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      key.intensity = 1.0 + 0.3 * Math.sin(t * 2.0);
      fill.intensity = 0.7 + 0.2 * Math.cos(t * 1.5);
      ring.material.color.setHSL((0.55 + 0.05 * Math.sin(t)) % 1, 0.8, 0.5);
      crowd.children.forEach((m, idx) => {
        const a = t * 0.6 + idx * 0.07;
        m.position.y = -1.25 + 0.15 * Math.sin(a);
      });
      if (segTex) segTex.needsUpdate = true;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    // リサイズ
    const onResize = () => {
      const w = container.clientWidth; const h = container.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    onResize();
    resizeObs = new ResizeObserver(onResize);
  resizeObs.observe(container);

  const api = { setSegCanvas, updatePlayerAvatar, updateHandLandmarks };
  onReady?.(api);
  dispatch('ready', api);
  });

  onDestroy(() => {
    if (resizeObs) { resizeObs.disconnect(); resizeObs = null; }
    cancelAnimationFrame(raf);
    renderer?.dispose();
    // 簡易破棄（詳細なジオメトリ/マテリアル破棄は省略）
  });
</script>

<style>
  .stage-root { position: absolute; inset: 0; z-index: 0; }
</style>

<div bind:this={container} class="stage-root"></div>
