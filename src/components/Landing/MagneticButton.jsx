"use client";
import { useRef, useState } from "react";

const MagneticButton = ({ children, className = "", strength = 0.08}) => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = (e.clientX - centerX) * strength;
    const y = (e.clientY - centerY) * strength;
    ref.current.style.translate = `${x}px ${y}px`;
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;

    ref.current.style.translate = "0px 0px";
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        translate: `${position.x}px ${position.y}px`,
        transition: position.x === 0 ? "translate 0.5s ease-out" : "translate 0.1s ease-out",
      }}
    >
      {children}
    </div>
  );
};

export default MagneticButton;
