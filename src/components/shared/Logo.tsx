// src/components/shared/Logo.tsx
import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  imageWidth?: number;
  imageHeight?: number;
}

const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  imageWidth = 218, 
  imageHeight = 60 
}) => {
  return (
    <Link href="/" className={`flex items-center group ${className}`} style={{ minHeight: `${imageHeight}px` }}>
      <Image
      src="/images/Genai.png"
      alt="GenAI-Campus Logo"
      width={imageWidth}
      height={imageHeight}
      priority
      className="group-hover:opacity-90 transition-opacity duration-200"
      style={{ height: 'auto' }} // Ensure aspect ratio is maintained if width is constrained/modified
      />
    </Link>
  );
};

export default Logo;
