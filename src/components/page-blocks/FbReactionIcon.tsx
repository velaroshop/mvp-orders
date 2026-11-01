import type { FbReaction } from "@/lib/page-blocks";

// Drawn here (not emoji) so the icons look the same on every phone. Simple flat versions of the Facebook reactions.
const YELLOW = "#f7b125";
const DARK = "#5b3b0b";

function Face({ children }: { children: React.ReactNode }) {
  return (
    <>
      <circle cx="10" cy="10" r="10" fill={YELLOW} />
      {children}
    </>
  );
}

function Icon({ type }: { type: FbReaction }) {
  switch (type) {
    case "like":
      return (
        <>
          <circle cx="10" cy="10" r="10" fill="#1877f2" />
          <path
            fill="#fff"
            d="M8.6 15.4h4.4c.5 0 .9-.3 1-.8l.9-4.2c.1-.6-.3-1.2-1-1.2h-2.4l.4-2c.1-.5-.1-1-.5-1.3-.4-.3-.9-.2-1.2.1L7.4 9v6.2l1.2.2Zm-2.9-6.3h1.2v6.3H5.7a.6.6 0 0 1-.6-.6V9.7c0-.3.3-.6.6-.6Z"
          />
        </>
      );
    case "love":
      return (
        <>
          <circle cx="10" cy="10" r="10" fill="#f33e58" />
          <path fill="#fff" d="M10 15.2 5.6 10.8a2.6 2.6 0 0 1 3.7-3.7l.7.7.7-.7a2.6 2.6 0 0 1 3.7 3.7L10 15.2Z" />
        </>
      );
    case "care":
      return (
        <Face>
          <path d="M5.6 8.6c.6-.5 1.5-.5 2.1 0M12.3 8.6c.6-.5 1.5-.5 2.1 0" stroke={DARK} strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M7.5 12.2c.8.9 4.2.9 5 0" stroke={DARK} strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path fill="#f33e58" d="M10 18.2 6.9 15a1.7 1.7 0 0 1 2.4-2.4l.7.7.7-.7a1.7 1.7 0 0 1 2.4 2.4L10 18.2Z" />
        </Face>
      );
    case "haha":
      return (
        <Face>
          <path d="M5.2 8.2c.6-.9 1.7-.9 2.3 0M12.5 8.2c.6-.9 1.7-.9 2.3 0" stroke={DARK} strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path fill={DARK} d="M4.8 11h10.4c0 3-2.3 5-5.2 5s-5.2-2-5.2-5Z" />
          <path fill="#e9575f" d="M7.4 14.6c.7-.9 4.5-.9 5.2 0-.8.9-4.4.9-5.2 0Z" />
        </Face>
      );
    case "wow":
      return (
        <Face>
          <circle cx="6.8" cy="8" r="1.2" fill={DARK} />
          <circle cx="13.2" cy="8" r="1.2" fill={DARK} />
          <ellipse cx="10" cy="13.6" rx="2" ry="2.6" fill={DARK} />
        </Face>
      );
    case "sad":
      return (
        <Face>
          <circle cx="6.8" cy="8.4" r="1.2" fill={DARK} />
          <circle cx="13.2" cy="8.4" r="1.2" fill={DARK} />
          <path d="M6.8 14.6c1-1.5 5.4-1.5 6.4 0" stroke={DARK} strokeWidth="1.3" strokeLinecap="round" fill="none" />
          <path fill="#3b9be8" d="M15 10.4c.8 1.3 1.2 2 1.2 2.7a1.2 1.2 0 0 1-2.4 0c0-.7.4-1.4 1.2-2.7Z" />
        </Face>
      );
    case "angry":
      return (
        <>
          <circle cx="10" cy="10" r="10" fill="#e9710f" />
          <path d="M4.8 6.6l4 1.6M15.2 6.6l-4 1.6" stroke={DARK} strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="7" cy="9.6" r="1.1" fill={DARK} />
          <circle cx="13" cy="9.6" r="1.1" fill={DARK} />
          <path d="M6.8 15c1-1.4 5.4-1.4 6.4 0" stroke={DARK} strokeWidth="1.3" strokeLinecap="round" fill="none" />
        </>
      );
  }
}

export default function FbReactionIcon({ type, size = 18 }: { type: FbReaction; size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" focusable="false">
      <Icon type={type} />
    </svg>
  );
}
