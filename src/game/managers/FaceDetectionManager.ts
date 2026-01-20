import type { GameManager } from "../GameManager"
import type { InputManager } from "./InputManager"
export class FaceDetectionManager {
  private readonly game: GameManager
  private faceMesh: any | null = null
  private readonly input: InputManager

  constructor(game: GameManager) {
    this.game = game;
    // InputManagerはGameManagerのpublicプロパティとしてアクセスできる想定だが、
    // コンストラクタ呼び出し順序の関係で、ここではGameManagerインスタンス経由でアクセスする
    // ただしInputManagerはGameManagerコンストラクタ内で生成されるため、このクラスのメソッド呼び出し時には存在するはず
    this.input = game.input;
  }

  init(): void {
    if (!this.game.isFaceMode()) return;

    if (!window.FaceMesh) {
      console.error('MediaPipe FaceMesh not loaded');
      return;
    }

    this.faceMesh = new window.FaceMesh({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.faceMesh.onResults((results: any) => this.handleFaceResults(results));
  }

  close(): void {
    if (this.faceMesh) {
      this.faceMesh.close();
      this.faceMesh = null;
    }
  }

  async send(frame: any): Promise<void> {
    if (this.faceMesh) {
      await this.faceMesh.send(frame);
    }
  }

  private handleFaceResults(results: any): void {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    // 上唇: 13, 下唇: 14
    // 基準とする顔の高さ: 10 (top) - 152 (chin)
    // 座標は0.0-1.0で返ってくる

    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const faceTop = landmarks[10];
    const chin = landmarks[152];
    const nose = landmarks[4]; // 鼻の頭をカーソル位置とする

    if (!upperLip || !lowerLip || !faceTop || !chin || !nose) return;

    // 開口率を計算
    const mouthOpenDist = Math.abs(lowerLip.y - upperLip.y);
    const faceHeight = Math.abs(chin.y - faceTop.y);
    const openRatio = mouthOpenDist / faceHeight;
    const isOpen = openRatio > 0.05;

    // 口の中心座標を計算
    const mouthX = (upperLip.x + lowerLip.x) / 2;
    const mouthY = (upperLip.y + lowerLip.y) / 2;

    // 座標を画面座標に変換 (左右反転を考慮)
    const screenX = (1 - mouthX) * window.innerWidth;
    const screenY = mouthY * window.innerHeight;

    // カーソル位置を更新
    this.game.lastMousePos = { x: screenX, y: screenY };

    // フェイスモード改修: 「開いた口の位置」でホールド
    if (isOpen) {
      this.game.checkLyrics(screenX, screenY, 0);
    } else {
      // 口を閉じている場合はホールド解除判定のために画面外の座標を渡す
      this.game.checkLyrics(-9999, -9999, 0);
    }
  }
}
