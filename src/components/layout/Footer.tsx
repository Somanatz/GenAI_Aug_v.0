// src/components/layout/Footer.tsx
import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground py-6 border-t">
      <div className="container mx-auto px-4 text-center">
        <h3 className="text-lg font-semibold mb-2 text-secondary-foreground">GenAI-Campus</h3>
        <p className="text-xs text-secondary-foreground/80 mb-3 max-w-md mx-auto">
          Empowering students, supporting teachers, and engaging parents with our innovative learning platform.
        </p>
        <p className="text-xs text-secondary-foreground/80">&copy; {new Date().getFullYear()} GenAI-Campus. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
