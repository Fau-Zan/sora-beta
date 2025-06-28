declare module 'violet' {
      export namespace Features {
            namespace Chess {
                  export interface GameInfo {
                        user: string;
                        from: string;
                  }
                  export interface Game {
                        fen: string;
                        black: string;
                        white: string;
                        turn: 'w' | 'b';
                        check: boolean;
                        id: string;
                        state: 'waiting' | 'playing';
                        lastMessage: string;
                        moves: string[];
                        opening?: string;
                  }
            }

            namespace Afk {
                  export interface AFKSystem {
                        message: string;
                        timestamp: number;
                  }
            }
      }
}
