declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

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
