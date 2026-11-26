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
          background: '#000820',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#B9EB32',
            fontSize: 26,
            fontWeight: 900,
            lineHeight: 1,
            fontFamily: 'Arial, sans-serif',
          }}
        >
          +
        </span>
      </div>
    ),
    { ...size },
  );
}