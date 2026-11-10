'use client';

import React from 'react';
import Link from 'next/link';

export default function TopBar() {
  return (
    <div className="hidden md:block bg-[#3a195a] text-white text-[11px] h-9 border-b border-[#4d2575]/40 select-none">
      <div className="max-w-site mx-auto h-full px-4 flex items-center justify-between">
        {/* Left: Brand title */}
        <div className="flex items-center">
          <Link
            href="/"
            className="font-bold text-white text-xs sm:text-[13px] tracking-tight hover:opacity-90 transition-opacity"
          >
            Mall by Thyaga
          </Link>
        </div>

        {/* Right: Social icons + Links */}
        <div className="flex items-center h-full">
          {/* Social Icons */}
          <div className="flex items-center gap-3.5 pr-4 text-white">
            {/* Facebook */}
            <a
              href="https://www.facebook.com/thyagalk/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="text-white hover:opacity-80 transition-opacity flex items-center"
            >
              <svg className="w-[11px] h-[13px] fill-current" viewBox="0 0 320 512">
                <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
              </svg>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/thyaga.lk/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-white hover:opacity-80 transition-opacity flex items-center"
            >
              <svg className="w-3 h-3 fill-current" viewBox="0 0 448 512">
                <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z" />
              </svg>
            </a>

            {/* LinkedIn */}
            <a
              href="https://www.linkedin.com/company/thyaga/posts/?feedView=all"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="text-white hover:opacity-80 transition-opacity flex items-center"
            >
              <svg className="w-3 h-3 fill-current" viewBox="0 0 448 512">
                <path d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.3 0-55.7 37.7-55.7 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.7-48.3 87.9-48.3 94 0 111.28 61.9 111.28 142.3V448z" />
              </svg>
            </a>
          </div>

          {/* Navigation Links with Dividers */}
          <nav className="flex items-center h-full text-white text-[10.5px] font-semibold tracking-wider uppercase">
            <Link
              href="/faq"
              className="h-full flex items-center px-3 border-l border-white/20 hover:text-white/80 transition-colors"
            >
              FAQ
            </Link>
            <Link
              href="/contact"
              className="h-full flex items-center px-3 border-l border-white/20 hover:text-white/80 transition-colors"
            >
              CONTACT US
            </Link>
            <Link
              href="/about"
              className="h-full flex items-center px-3 border-l border-r border-white/20 hover:text-white/80 transition-colors"
            >
              ABOUT US
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
