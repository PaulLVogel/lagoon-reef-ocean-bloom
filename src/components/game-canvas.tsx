import { useEffect, useRef } from "react";

export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let game: { destroy: (remove: boolean) => void } | null = null;
    let cancelled = false;

    void import("@/game/createGame").then(({ createGame }) => {
      if (cancelled || !hostRef.current) return;
      game = createGame(hostRef.current);
    });

    return () => {
      cancelled = true;
      game?.destroy(true);
      game = null;
    };
  }, []);

  return (
    <div
      ref={hostRef}
      id="phaser-root"
      className="absolute inset-0 h-full w-full touch-none overflow-hidden bg-bg [&_canvas]:mx-auto [&_canvas]:block [&_canvas]:h-auto [&_canvas]:max-h-full [&_canvas]:w-auto [&_canvas]:max-w-full"
    />
  );
}
