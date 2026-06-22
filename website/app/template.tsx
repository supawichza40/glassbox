// A template re-mounts on every navigation, so this gives each route a gentle
// fade-up entrance (gb-rise). Degrades to a static state under reduced-motion
// via the global guard in globals.css.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="gb-rise">{children}</div>;
}
