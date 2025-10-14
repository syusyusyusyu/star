/// <reference types="vite/client" />

// グローバルなWindow拡張
declare global {
  interface Window {
    GameManager: any;
    gameManager: any;
    songConfig: any;
    Player: any;
  }
}

export {}
