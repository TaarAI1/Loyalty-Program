import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#FFD000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Gift box SVG path rendered as inline shapes */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          {/* Box bottom */}
          <rect x="2" y="11" width="20" height="11" rx="1" fill="#111111" />
          {/* Lid */}
          <rect x="1" y="7" width="22" height="5" rx="1" fill="#111111" />
          {/* Ribbon vertical */}
          <rect x="10.5" y="7" width="3" height="15" fill="#FFD000" />
          {/* Ribbon horizontal on lid */}
          <rect x="1" y="9" width="22" height="3" fill="#FFD000" />
          {/* Bow left loop */}
          <path d="M12 7 C10 5, 6 4, 7 7 C8 9, 11 8, 12 7Z" fill="#FFD000" stroke="#111" strokeWidth="0.5" />
          {/* Bow right loop */}
          <path d="M12 7 C14 5, 18 4, 17 7 C16 9, 13 8, 12 7Z" fill="#FFD000" stroke="#111" strokeWidth="0.5" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
