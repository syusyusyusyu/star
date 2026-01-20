import * as THREE from "three"
import type { Landmark, PlayerAvatar } from "../types"

declare global {
  interface Window {
    POSE_CONNECTIONS: any
  }
}

const { POSE_CONNECTIONS } = window as any

export class LiveStageVisuals {
  private container: HTMLElement
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private playerAvatar: PlayerAvatar = {}
  private activeHandJoints: THREE.Mesh[] = []
  private palmJointPool: THREE.Mesh[] = []
  private tipJointPool: THREE.Mesh[] = []
  private leftPenlight!: THREE.Mesh
  private rightPenlight!: THREE.Mesh
  private static jointGeometry: THREE.SphereGeometry | null = null
  private static jointMaterial: THREE.MeshBasicMaterial | null = null
  private static boneMaterial: THREE.LineBasicMaterial | null = null
  private static penlightGeometry: THREE.CylinderGeometry | null = null
  private static penlightMaterial: THREE.MeshBasicMaterial | null = null
  private static palmJointGeometry: THREE.SphereGeometry | null = null
  private static tipJointGeometry: THREE.SphereGeometry | null = null

  constructor(container: HTMLElement) {
    this.container = container;
    this.initThreeJS();
    // render() は GameManager の GameLoop から呼び出すため、自己再帰 animate() は使用しない
  }

  initThreeJS(): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    this.camera.position.set(0, 100, 150);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.zIndex = '2'; // UIの下、背景の上
    this.container.appendChild(this.renderer.domElement);

    // リサイズイベントの設定
    window.addEventListener('resize', () => this.onResize());

    // 手の描画用配列を初期化済み

    const penlightGeometry = LiveStageVisuals.getPenlightGeometry();
    const penlightMaterial = LiveStageVisuals.getPenlightMaterial();
    this.leftPenlight = new THREE.Mesh(penlightGeometry, penlightMaterial);
    this.rightPenlight = new THREE.Mesh(penlightGeometry, penlightMaterial);
  }

  setVideoTexture(videoElement: HTMLVideoElement): void {
    const videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.wrapS = THREE.RepeatWrapping;
    videoTexture.repeat.x = -1;
    this.scene.background = videoTexture;
  }

  updatePlayerAvatar(landmarks: Landmark[]): void {
    if (!this.playerAvatar.joints) {
      this.playerAvatar.joints = {};
      this.playerAvatar.bones = {};

      const connections = POSE_CONNECTIONS;
      for (let i = 0; i < connections.length; i++) {
        const pair = connections[i];
        const start = pair[0];
        const end = pair[1];

        if (!this.playerAvatar.joints[start]) {
          const jointGeometry = LiveStageVisuals.getJointGeometry();
          const jointMaterial = LiveStageVisuals.getJointMaterial();
          this.playerAvatar.joints[start] = new THREE.Mesh(jointGeometry, jointMaterial);
          this.scene.add(this.playerAvatar.joints[start]);
        }
        if (!this.playerAvatar.joints[end]) {
          const jointGeometry = LiveStageVisuals.getJointGeometry();
          const jointMaterial = LiveStageVisuals.getJointMaterial();
          this.playerAvatar.joints[end] = new THREE.Mesh(jointGeometry, jointMaterial);
          this.scene.add(this.playerAvatar.joints[end]);
        }

        const boneGeometry = new THREE.BufferGeometry();
        boneGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
        this.playerAvatar.bones[i] = new THREE.Line(boneGeometry, LiveStageVisuals.getBoneMaterial());
        this.scene.add(this.playerAvatar.bones[i]);
      }
    }

    for (let i = 0; i < landmarks.length; i++) {
      const landmark = landmarks[i];
      const joint = this.playerAvatar.joints[i];
      if (joint) {
        joint.position.x = (landmark.x - 0.5) * -window.innerWidth;
        joint.position.y = (1 - landmark.y) * window.innerHeight - (window.innerHeight / 2);
        joint.position.z = (landmark.z || 0) * -1000;
      }
    }

    const connections = POSE_CONNECTIONS;
    for (let i = 0; i < connections.length; i++) {
      const pair = connections[i];
      if (!pair) continue;
      const start = pair[0];
      const end = pair[1];
      const bone = this.playerAvatar.bones?.[i];
      const startJoint = this.playerAvatar.joints?.[start];
      const endJoint = this.playerAvatar.joints?.[end];
      if (bone && startJoint && endJoint) {
        const positions = bone.geometry.attributes.position.array as Float32Array;
        positions[0] = startJoint.position.x;
        positions[1] = startJoint.position.y;
        positions[2] = startJoint.position.z;
        positions[3] = endJoint.position.x;
        positions[4] = endJoint.position.y;
        positions[5] = endJoint.position.z;
        bone.geometry.attributes.position.needsUpdate = true;
      }
    }

    if (this.playerAvatar.joints[15]) {
        this.leftPenlight.position.copy(this.playerAvatar.joints[15].position);
    }
    if (this.playerAvatar.joints[16]) {
        this.rightPenlight.position.copy(this.playerAvatar.joints[16].position);
    }
  }

  updateHandLandmarks(handsResults: { multiHandLandmarks?: Array<Landmark[]> }): void {
    this.recycleHandJoints();
    if (!handsResults.multiHandLandmarks) return;

    handsResults.multiHandLandmarks.forEach((landmarks: Landmark[], handIndex: number) => {
      // 手のひらの中心（ランドマーク0）を大きな球体で表示
      const palmLandmark = landmarks[0];
      const palmJoint = this.acquireHandJoint('palm');
      this.updateHandJointAppearance(palmJoint, handIndex === 0 ? 0x39c5bb : 0xff6b6b, 0.8);
      this.positionHandJoint(palmJoint, palmLandmark, -800);
      this.activeHandJoints.push(palmJoint);

      // 人差し指の先端（ランドマーク8）を小さな球体で表示
      const fingerTip = landmarks[8];
      const tipJoint = this.acquireHandJoint('tip');
      this.updateHandJointAppearance(tipJoint, 0xffffff, 0.9);
      this.positionHandJoint(tipJoint, fingerTip, -800);
      this.activeHandJoints.push(tipJoint);
    });
  }

  private recycleHandJoints(): void {
    if (this.activeHandJoints.length === 0) return;
    this.activeHandJoints.forEach(mesh => this.releaseHandJoint(mesh));
    this.activeHandJoints.length = 0;
  }

  private acquireHandJoint(type: 'palm' | 'tip'): THREE.Mesh {
    const pool = type === 'palm' ? this.palmJointPool : this.tipJointPool;
    let mesh = pool.pop();
    if (!mesh) {
      const geometry = type === 'palm' ? LiveStageVisuals.getPalmGeometry() : LiveStageVisuals.getTipGeometry();
      mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ transparent: true }));
      mesh.userData.handJointType = type;
      this.scene.add(mesh);
    }
    mesh.visible = true;
    return mesh;
  }

  private releaseHandJoint(mesh: THREE.Mesh): void {
    mesh.visible = false;
    const type = mesh.userData.handJointType === 'tip' ? 'tip' : 'palm';
    const pool = type === 'palm' ? this.palmJointPool : this.tipJointPool;
    pool.push(mesh);
  }

  private positionHandJoint(mesh: THREE.Mesh, landmark: Landmark, depthScale: number): void {
    mesh.position.x = (landmark.x - 0.5) * -window.innerWidth;
    mesh.position.y = (1 - landmark.y) * window.innerHeight - (window.innerHeight / 2);
    mesh.position.z = (landmark.z || 0) * depthScale;
  }

  private updateHandJointAppearance(mesh: THREE.Mesh, color: number, opacity: number): void {
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.color.setHex(color);
    material.opacity = opacity;
  }

  /**
   * 1フレーム分のレンダリングを実行。
   * GameManager の GameLoop から呼ばれる（自己再帰ではない）。
   */
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private static getJointGeometry(): THREE.SphereGeometry {
    if (!LiveStageVisuals.jointGeometry) {
      LiveStageVisuals.jointGeometry = new THREE.SphereGeometry(5, 32, 32);
    }
    return LiveStageVisuals.jointGeometry;
  }

  private static getJointMaterial(): THREE.MeshBasicMaterial {
    if (!LiveStageVisuals.jointMaterial) {
      LiveStageVisuals.jointMaterial = new THREE.MeshBasicMaterial({ color: 0x39c5bb });
    }
    return LiveStageVisuals.jointMaterial;
  }

  private static getBoneMaterial(): THREE.LineBasicMaterial {
    if (!LiveStageVisuals.boneMaterial) {
      LiveStageVisuals.boneMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 5 });
    }
    return LiveStageVisuals.boneMaterial;
  }

  private static getPenlightGeometry(): THREE.CylinderGeometry {
    if (!LiveStageVisuals.penlightGeometry) {
      LiveStageVisuals.penlightGeometry = new THREE.CylinderGeometry(2, 2, 40, 32);
    }
    return LiveStageVisuals.penlightGeometry;
  }

  private static getPenlightMaterial(): THREE.MeshBasicMaterial {
    if (!LiveStageVisuals.penlightMaterial) {
      LiveStageVisuals.penlightMaterial = new THREE.MeshBasicMaterial({ color: 0x39c5bb, transparent: true, opacity: 0.8 });
    }
    return LiveStageVisuals.penlightMaterial;
  }

  private static getPalmGeometry(): THREE.SphereGeometry {
    if (!LiveStageVisuals.palmJointGeometry) {
      LiveStageVisuals.palmJointGeometry = new THREE.SphereGeometry(15, 32, 32);
    }
    return LiveStageVisuals.palmJointGeometry;
  }

  private static getTipGeometry(): THREE.SphereGeometry {
    if (!LiveStageVisuals.tipJointGeometry) {
      LiveStageVisuals.tipJointGeometry = new THREE.SphereGeometry(8, 16, 16);
    }
    return LiveStageVisuals.tipJointGeometry;
  }
}
