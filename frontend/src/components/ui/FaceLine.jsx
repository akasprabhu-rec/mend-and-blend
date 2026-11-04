// Abstract continuous-line face in profile. Colour comes from the text colour
// class you pass in (stroke="currentColor"). Use `flip` to face the other way.
export default function FaceLine({ className = "", flip = false }) {
  const shared = { pathLength: 1, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  return (
    <svg
      viewBox="0 0 400 520"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
      className={`line-draw ${flip ? "-scale-x-100" : ""} ${className}`}
    >
      <path
        {...shared}
        d="M96 300 C70 200 110 90 205 66 C285 48 338 100 332 172 C330 200 346 226 356 254 C361 268 350 276 334 276 C334 290 344 296 338 306 C333 314 342 318 336 328 C332 346 338 360 322 382 C306 402 276 410 246 404 C240 440 246 480 258 520"
      />
      <path
        {...shared}
        d="M96 300 C90 360 130 400 176 408 C214 415 232 440 222 470 C216 492 196 504 176 520"
      />
      <path
        {...shared}
        d="M190 150 C230 118 290 150 258 186 C228 216 172 186 196 158 C214 138 246 156 238 174 C232 186 214 182 216 172"
      />
      <path {...shared} d="M292 196 C304 188 318 190 326 200 M120 120 C90 80 40 100 60 140 C74 166 112 150 100 128" />
    </svg>
  );
}
