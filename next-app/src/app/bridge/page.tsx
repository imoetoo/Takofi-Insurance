'use client';

import { useState } from 'react';
import { ArrowsUpDownIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

export default function Bridge() {
  const [fromNetwork, setFromNetwork] = useState('Ethereum');
  const [toNetwork, setToNetwork] = useState('ZKsync Era');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('ETH');

  const networks = ['Ethereum', 'ZKsync Era', 'Polygon', 'Arbitrum'];
  const tokens = ['ETH', 'USDC', 'USDT', 'DAI'];

  const handleSwapNetworks = () => {
    const temp = fromNetwork;
    setFromNetwork(toNetwork);
    setToNetwork(temp);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">🌉 Bridge</h1>
            <p className="text-gray-400">Transfer assets between networks</p>
          </div>

          {/* Bridge Form */}
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6">
            {/* From Section */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                From
              </label>
              <div className="bg-gray-800 rounded-xl border border-gray-600 p-4">
                {/* Network Selector */}
                <div className="flex items-center justify-between mb-3">
                  <button className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-600 transition-colors">
                    <div className="w-5 h-5 bg-blue-500 rounded-full"></div>
                    {fromNetwork}
                    <ChevronDownIcon className="w-4 h-4" />
                  </button>
                  <div className="text-sm text-gray-400">Balance: 1.234 ETH</div>
                </div>

                {/* Amount Input */}
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 bg-transparent text-2xl font-medium outline-none placeholder-gray-500"
                  />
                  <button className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-600 transition-colors">
                    <div className="w-5 h-5 bg-gray-400 rounded-full"></div>
                    {selectedToken}
                    <ChevronDownIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center mb-4">
              <button
                onClick={handleSwapNetworks}
                className="bg-gray-800 border border-gray-600 rounded-xl p-2 hover:bg-gray-700 transition-colors"
              >
                <ArrowsUpDownIcon className="w-5 h-5" />
              </button>
            </div>

            {/* To Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                To
              </label>
              <div className="bg-gray-800 rounded-xl border border-gray-600 p-4">
                {/* Network Selector */}
                <div className="flex items-center justify-between mb-3">
                  <button className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-600 transition-colors">
                    <div className="w-5 h-5 bg-purple-500 rounded-full"></div>
                    {toNetwork}
                    <ChevronDownIcon className="w-4 h-4" />
                  </button>
                  <div className="text-sm text-gray-400">Balance: 0.567 ETH</div>
                </div>

                {/* Estimated Amount */}
                <div className="text-2xl font-medium text-gray-400">
                  {amount || '0.0'}
                </div>
              </div>
            </div>

            {/* Bridge Details */}
            <div className="bg-gray-800 rounded-xl border border-gray-600 p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Bridge Fee:</span>
                  <span>0.001 ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Gas Fee:</span>
                  <span>~$5.23</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Estimated Time:</span>
                  <span>~15 minutes</span>
                </div>
                <hr className="border-gray-600 my-2" />
                <div className="flex justify-between font-medium">
                  <span className="text-gray-400">You'll receive:</span>
                  <span>{amount ? (parseFloat(amount) - 0.001).toFixed(3) : '0.0'} ETH</span>
                </div>
              </div>
            </div>

            {/* Bridge Button */}
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {!amount ? 'Enter amount' : 'Bridge Assets'}
            </button>

            {/* Warning */}
            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
              <p className="text-yellow-300 text-sm">
                ⚠️ Make sure to double-check the destination network before bridging.
              </p>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Recent Bridge Transactions</h2>
            <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
              <div className="text-center text-gray-400 py-8">
                No recent transactions
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}