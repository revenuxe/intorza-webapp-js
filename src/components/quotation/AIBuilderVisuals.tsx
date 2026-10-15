import { useId } from 'react';

export function GoldCoin({ className = 'h-4 w-4' }: { className?: string }) {
  const id = useId();
  return <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
    <defs><linearGradient id={id} x1="4" y1="2" x2="20" y2="23" gradientUnits="userSpaceOnUse"><stop stopColor="#FFE9A0" /><stop offset=".45" stopColor="#F6C34F" /><stop offset="1" stopColor="#C58617" /></linearGradient></defs>
    <circle cx="12" cy="12" r="10.5" fill={`url(#${id})`} stroke="#BC8018" /><circle cx="12" cy="12" r="7.6" stroke="#FFF0AD" strokeWidth="1.2" /><path d="M10 7.5h4m-2 0v9m-2 0h4" stroke="#98620C" strokeWidth="1.8" strokeLinecap="round" /><path d="m5 5 1-1m12 15 1-1" stroke="#FFF5C9" strokeWidth="1.4" strokeLinecap="round" />
  </svg>;
}

export function BuilderMark({ className = 'h-4 w-4' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z" /><path d="m3 7 9 5 9-5M12 12v10M7.5 4.5l9 5v5l-4.5 2.5" /><path d="m7.5 9.5 4.5-2.5 4.5 2.5" /></svg>;
}

/** Small native SVG illustrations stay crisp without downloading image assets. */
export function BuilderArtwork({ kind }: { kind: 'upload' | 'details' }) {
  return <svg viewBox="0 0 200 128" className="h-full w-full" fill="none" aria-hidden="true">
    {kind === 'upload' ? <>
      <rect x="39" y="19" width="116" height="91" rx="9" fill="white" stroke="#D9D8D3" /><path d="M51 32h35v27H51zm0 34h35v30H51zm43-34h48v36H94zm0 44h48v20H94z" fill="#F5EDE6" stroke="#C1A58D" strokeWidth="1.2" /><path d="M69 32v27M113 32v36M94 50h48M51 82h35" stroke="#D2BFAA" /><path d="M86 49v10h8M86 76v-9h8M113 68v8" stroke="white" strokeWidth="4" /><path d="M30 40V24a9 9 0 0 1 9-9h16m85 0h16a9 9 0 0 1 9 9v16M30 88v16a9 9 0 0 0 9 9h16m85 0h16a9 9 0 0 0 9-9V88" stroke="#C35A39" strokeWidth="2" strokeLinecap="round" /><path d="M24 63h148" stroke="#D76D4D" strokeWidth="1.7" /><rect x="130" y="77" width="40" height="36" rx="11" fill="#C05033" /><path d="M150 102V88m-6 6 6-6 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </> : <>
      <rect x="52" y="22" width="103" height="90" rx="8" fill="#E8E1D8" transform="rotate(7 52 22)" /><rect x="48" y="15" width="103" height="96" rx="8" fill="white" stroke="#D9D8D3" /><rect x="60" y="29" width="26" height="25" rx="6" fill="#EFE7DD" /><path d="m66 41 7-6 7 6v8h-14v-8Z" stroke="#977B58" strokeWidth="1.5" strokeLinejoin="round" /><path d="M95 34h41M95 43h29M60 65h76M60 81h43M121 81h15M60 94h34M121 94h15" stroke="#D1C9BF" strokeWidth="3" strokeLinecap="round" /><rect x="115" y="85" width="48" height="30" rx="9" fill="#3F6659" /><path d="m126 100 6 6 14-14" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </>}
  </svg>;
}
