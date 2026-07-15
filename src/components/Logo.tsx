/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
// @ts-ignore
import jjmLogo from "../assets/images/jjm_logo_1784075385580.jpg";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "h-14", showText = true }) => {
  return (
    <div id="jjm-logo-wrapper" className={`flex items-center select-none ${className}`}>
      <div className="bg-white p-1 rounded-xl shadow-md border border-slate-200 flex items-center justify-center overflow-hidden h-full max-h-full aspect-[4/3]">
        <img
          src={jjmLogo}
          alt="J²M JJM Tecnologías"
          className="h-full w-auto object-contain select-none transition-transform hover:scale-105 duration-300"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
};
