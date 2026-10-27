import React, { useState } from 'react';

interface MiloAssetImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  path: string; // Relative path in PNG folder, e.g. "1/VIỆC GÌ KHÓ, CÓ MILO CỔ VŨ LÀM TỚI CÙNG!.png"
  fallbackText?: string;
  className?: string;
}

export const MiloAssetImage: React.FC<MiloAssetImageProps> = ({
  path,
  fallbackText,
  className = '',
  alt = '',
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  // Encode URI to safely handle spaces and Vietnamese characters
  const encodedPath = `/PNG/${path.split('/').map(segment => encodeURIComponent(segment)).join('/')}`;

  if (hasError) {
    if (fallbackText) {
      return (
        <span className={`inline-block font-black uppercase tracking-tight text-[#FFDF00] drop-shadow ${className}`}>
          {fallbackText}
        </span>
      );
    }
    return null;
  }

  return (
    <img
      src={encodedPath}
      alt={alt || fallbackText || 'Milo PNG Asset'}
      onError={() => setHasError(true)}
      className={`object-contain max-w-full select-none ${className}`}
      {...props}
    />
  );
};
