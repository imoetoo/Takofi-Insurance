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
            href="/insurance-market"
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors py-2 px-1 text-base font-medium"
          >
            <span>Insurance Market</span>
          </Link>
          <Link
            href="/principal-market"
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors py-2 px-1 text-base font-medium"
          >
            <span>Principal Market</span>
          </Link>
          <Link
            href="/mint-tokens"
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors py-2 px-1 text-base font-medium"
          >
            <span>Mint Tokens</span>
          </Link>
          <Link
            href="/redeem-principal"
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors py-2 px-1 text-base font-medium"
          >
            <span>Redeem PT</span>
          </Link>
          <Link
            href="/redeem-insurance"
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors py-2 px-1 text-base font-medium"
          >
            <span>Submit Claims</span>
          </Link>
        </div>
      </div>

      {/* Right side - Network selector and Connect button */}
      <div className="flex items-center gap-5">
        <ConnectButton />
        <a
          href="https://github.com/imoetoo"
          target="_blank"
          className="p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors hidden md:block"
        >
          <FaGithub className="h-6 w-6 text-white" />
        </a>
      </div>
    </nav>
  );
}
