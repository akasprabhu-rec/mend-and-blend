import { useEffect, useState } from "react";
import logo from "../assets/logo.jpg";
import logoTrace from "../assets/logoTrace.json";

const INTRO_DURATION = 2800;
const INTRO_SEEN_KEY = "mend-and-blend-logo-intro-seen";
let introShownThisTab = false;

function shouldShowIntro() {
  if (
    introShownThisTab ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) return false;
  try {
    return !window.sessionStorage.getItem(INTRO_SEEN_KEY);
  } catch {
    return !introShownThisTab;
  }
}

export default function LogoIntro() {
  const [visible, setVisible] = useState(shouldShowIntro);

  useEffect(() => {
    if (!visible) return undefined;
    introShownThisTab = true;
    try {
      window.sessionStorage.setItem(INTRO_SEEN_KEY, "true");
    } catch {
      // The timeout still guarantees the page is revealed if storage is disabled.
    }
    const timer = window.setTimeout(() => setVisible(false), INTRO_DURATION);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  const renderPaths = (paths) =>
    paths.map((path, index) => (
      <path key={index} pathLength="1" d={path} />
    ));

  return (
    <div className="logo-intro" aria-hidden="true">
      <svg
        className="logo-intro__artwork"
        viewBox="0 0 1000 1000"
        role="presentation"
      >
        <defs>
          <mask
            id="logo-intro-mask"
            maskUnits="userSpaceOnUse"
            maskContentUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="1000"
            height="1000"
          >
            <rect width="1000" height="1000" fill="black" />
            <g className="logo-intro__stroke logo-intro__upper-hand">
              {renderPaths(logoTrace.upper)}
            </g>
            <g className="logo-intro__stroke logo-intro__arch">
              {renderPaths(logoTrace.arch)}
            </g>
            <g className="logo-intro__stroke logo-intro__lower-hand">
              {renderPaths(logoTrace.lower)}
            </g>
            <g className="logo-intro__stroke logo-intro__lettering">
              {renderPaths(logoTrace.lettering)}
            </g>
            <rect
              className="logo-intro__finish"
              width="1000"
              height="1000"
              fill="white"
            />
          </mask>
        </defs>
        <rect width="1000" height="1000" fill="#416187" />
        <image
          href={logo}
          width="1000"
          height="1000"
          preserveAspectRatio="xMidYMid meet"
          mask="url(#logo-intro-mask)"
        />
      </svg>
    </div>
  );
}
