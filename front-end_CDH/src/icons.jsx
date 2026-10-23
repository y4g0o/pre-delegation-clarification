/* Original outline icons inspired by Phosphor's geometric style.
   24px viewBox, currentColor stroke, 1.5px line weight. */

const _ico = (children) => ({ size = 20, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {children}
  </svg>
);

const IconHome = _ico(
  <>
    <path d="M3.5 10.5 12 4l8.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-3.5V14h-7v6.5H5A1.5 1.5 0 0 1 3.5 19z" />
  </>
);

const IconPlay = _ico(
  <>
    <path d="M7 5v14l11-7z" />
  </>
);

const IconNetwork = _ico(
  <>
    <circle cx="12" cy="5" r="2.2" />
    <circle cx="5"  cy="18" r="2.2" />
    <circle cx="12" cy="18" r="2.2" />
    <circle cx="19" cy="18" r="2.2" />
    <path d="M12 7.2v3.6M12 10.8 5 15.8M12 10.8 12 15.8M12 10.8 19 15.8" />
  </>
);

const IconBars = _ico(
  <>
    <path d="M5 19V11M12 19V5M19 19V14" />
    <path d="M3.5 19.5h17" />
  </>
);

const IconClock = _ico(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>
);

const IconSettings = _ico(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .32 1.76l.06.06a1.94 1.94 0 1 1-2.74 2.74l-.06-.06a1.6 1.6 0 0 0-1.76-.32 1.6 1.6 0 0 0-.97 1.47V21a1.94 1.94 0 1 1-3.88 0v-.1a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.76.32l-.06.06a1.94 1.94 0 1 1-2.74-2.74l.06-.06a1.6 1.6 0 0 0 .32-1.76 1.6 1.6 0 0 0-1.47-.97H3a1.94 1.94 0 1 1 0-3.88h.1a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.76l-.06-.06a1.94 1.94 0 1 1 2.74-2.74l.06.06a1.6 1.6 0 0 0 1.76.32H9a1.6 1.6 0 0 0 .97-1.47V3a1.94 1.94 0 1 1 3.88 0v.1a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.76-.32l.06-.06a1.94 1.94 0 1 1 2.74 2.74l-.06.06a1.6 1.6 0 0 0-.32 1.76V9c.27.62.86 1.04 1.53 1.05H21a1.94 1.94 0 1 1 0 3.88h-.1a1.6 1.6 0 0 0-1.5 1.07z" />
  </>
);

const IconArrowUp = _ico(<path d="M12 19V5M6 11l6-6 6 6" />);
const IconArrowDown = _ico(<path d="M12 5v14M6 13l6 6 6-6" />);
const IconArrowRight = _ico(<path d="M5 12h14M13 6l6 6-6 6" />);

const IconSearch = _ico(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.3-4.3" />
  </>
);

const IconFilter = _ico(
  <path d="M4 5h16l-6 8v6l-4-2v-4z" />
);

const IconChevronDown = _ico(<path d="m6 9 6 6 6-6" />);
const IconChevronRight = _ico(<path d="m9 6 6 6-6 6" />);

const IconCheck = _ico(<path d="m5 12 4 4 10-10" />);
const IconX = _ico(<path d="M6 6l12 12M18 6 6 18" />);

const IconBolt = _ico(<path d="M13 3 4 14h7l-1 7 9-11h-7z" />);

const IconCpu = _ico(
  <>
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <rect x="9" y="9" width="6"  height="6"  rx="1" />
    <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
  </>
);

const IconCoins = _ico(
  <>
    <ellipse cx="9" cy="8" rx="5.5" ry="2.2" />
    <path d="M3.5 8v3.5C3.5 12.7 5.96 13.7 9 13.7s5.5-1 5.5-2.2V8" />
    <path d="M3.5 11.5V15c0 1.2 2.46 2.2 5.5 2.2s5.5-1 5.5-2.2v-3.5" />
    <ellipse cx="15" cy="15" rx="5.5" ry="2.2" />
    <path d="M9.5 15v3.5c0 1.2 2.46 2.2 5.5 2.2s5.5-1 5.5-2.2V15" />
  </>
);

const IconClipboard = _ico(
  <>
    <rect x="6" y="4" width="12" height="17" rx="2" />
    <rect x="9" y="2.5" width="6" height="3" rx="1" />
    <path d="M9 10h6M9 13.5h6M9 17h4" />
  </>
);

const IconRefresh = _ico(
  <>
    <path d="M3.5 12a8.5 8.5 0 0 1 14.5-6L20 8" />
    <path d="M20 4v4h-4" />
    <path d="M20.5 12a8.5 8.5 0 0 1-14.5 6L4 16" />
    <path d="M4 20v-4h4" />
  </>
);

const IconCircleDot = _ico(
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
  </>
);

const IconWarning = _ico(
  <>
    <path d="M12 3.5 21 19H3z" />
    <path d="M12 10v4M12 17h.01" />
  </>
);

const IconBeaker = _ico(
  <>
    <path d="M9 3h6" />
    <path d="M10 3v7l-5 8a2 2 0 0 0 1.7 3h10.6A2 2 0 0 0 19 18l-5-8V3" />
    <path d="M7 15h10" />
  </>
);

const IconText = _ico(
  <>
    <path d="M5 6V4h14v2" />
    <path d="M12 4v16" />
    <path d="M9 20h6" />
  </>
);

const IconGlobe = _ico(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.5 2.5 4 5.5 4 8.5s-1.5 6-4 8.5c-2.5-2.5-4-5.5-4-8.5s1.5-6 4-8.5z" />
  </>
);

const IconWrench = _ico(
  <path d="M14.7 6.3a4 4 0 0 1 5.3 4.7l-2.6-2.6-2.4 2.4 2.6 2.6a4 4 0 0 1-4.7-5.3L4.5 16.5a2.1 2.1 0 1 0 3 3l8.7-8.7" />
);

const IconQuestion = _ico(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1.5 1-1.5 2v.7" />
    <path d="M12 17h.01" />
  </>
);

const IconSplit = _ico(
  <>
    <path d="M4 6h5l3 6 3-6h5" />
    <path d="M4 18h5l3-6 3 6h5" />
  </>
);

const IconStop = _ico(<rect x="6" y="6" width="12" height="12" rx="1.5" />);

const IconExport = _ico(
  <>
    <path d="M12 3v12" />
    <path d="m7 8 5-5 5 5" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </>
);

Object.assign(window, {
  IconHome, IconPlay, IconNetwork, IconBars, IconClock, IconSettings,
  IconArrowUp, IconArrowDown, IconArrowRight,
  IconSearch, IconFilter, IconChevronDown, IconChevronRight,
  IconCheck, IconX, IconBolt, IconCpu, IconCoins, IconClipboard,
  IconRefresh, IconCircleDot, IconWarning, IconBeaker, IconText, IconGlobe,
  IconWrench, IconQuestion, IconSplit, IconStop, IconExport,
});
