"use client"
import React from 'react';
import Link from 'next/link';
import { ModeToggle } from "@/components/theme-toggle";
import { ConnectButton } from '@rainbow-me/rainbowkit';

const NavigationHeader: React.FC = () => {
  
  return (
    <header className="w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 transition-colors">
      <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-black dark:text-white transition-colors">
        Story Protocol Take Home - Aryan Parekh
        </Link>
        <ul className="flex space-x-6 items-center">
          <li>
            <Link href="/" className="text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors font-medium">
              Record
            </Link>
          </li>
          <li>
            <Link href="/gallery" className="text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors font-medium">
              Gallery
            </Link>
          </li>
          <li>
            <Link href="/inventory" className="text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors font-medium">
              Inventory
            </Link>
          </li>
          <li>
            <Link href="/swap" className="text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors font-medium">
              Swap
            </Link>
          </li>
          <li>
            <ConnectButton />
          </li>
          <li>
            <ModeToggle />
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default NavigationHeader;