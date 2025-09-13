"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { FaGithub } from "react-icons/fa";
import Image from "next/image";
import Takopi_anime1 from "../../public/Takopi_anime1.png";
import Link from "next/link";

export default function Header() {
  return (
    <nav className="px-8 py-4 bg-black border-b border-gray-800 flex items-center justify-between min-h-[70px]">
      {/* Left side - Logo and Navigation */}
      <div className="flex items-center gap-10">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src={Takopi_anime1}
            alt="TakoFi"
            width={55}
            height={55}
            className="rounded"
          />
          <span className="text-white font-bold text-xl">TakoFi</span>
          <span className="bg-gray-700 text-gray-300 text-xs px-2.5 py-1.5 rounded uppercase font-medium tracking-wider">
            BETA
          </span>
        </Link>

        {/* Navigation Items */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/bridge"
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors py-2 px-1 text-base font-medium"
          >
            <span className="text-base">🌉</span>
            <span>Bridge</span>
          </Link>
          <Link
            href="/marketplace"
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors py-2 px-1 text-base font-medium"
          >
            <span className="text-base">💼</span>
            <span>Assets</span>
          </Link>
          <Link
            href="/mintTokens"
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors py-2 px-1 text-base font-medium"
          >
            <span className="text-base">↔️</span>
            <span>Transfers</span>
          </Link>
        </div>
      </div>

      {/* Right side - Network selector and Connect button */}
      <div className="flex items-center gap-5">
        <div className="hidden lg:flex items-center gap-2 bg-gray-800 px-4 py-2.5 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">
          <span className="text-white text-base font-medium">
            ⚡ ZKsync Era
          </span>
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
        <ConnectButton />
        <a
          href="https://github.com/imoetoo"
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors hidden md:block"
        >
          <FaGithub className="h-6 w-6 text-white" />
        </a>
      </div>
    </nav>
  );
}
