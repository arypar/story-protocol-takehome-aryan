# Story Protocol Music NFT Platform

A decentralized music platform built on the Story Protocol that allows users to record audio, create albums, mint them as NFTs, and manage intellectual property rights through license tokens.

## 🎵 Overview

This application is a comprehensive Web3 music platform that combines audio recording, IPFS storage, NFT minting, and IP licensing into a seamless user experience. Built with Next.js and the Story Protocol SDK, it demonstrates the future of decentralized music ownership and licensing.

## ✨ Features

### 🎙️ Audio Recording & Album Creation
- **Multi-track Recording**: Record multiple songs for an album using browser-based audio recording
- **Album Management**: Create albums with cover images and organize multiple tracks
- **Real-time Audio Processing**: Built-in audio recording with WebRTC MediaRecorder API

### 🔗 IPFS Integration
- **Decentralized Storage**: All audio files and metadata stored on IPFS via Pinata
- **Immutable Content**: Ensures permanent availability of your musical creations
- **Metadata Standards**: Follows NFT metadata standards for maximum compatibility

### 🏛️ Story Protocol Integration
- **IP Asset Registration**: Register your music as intellectual property on Story Protocol
- **License Management**: Create and manage commercial use licenses for your music
- **Revenue Sharing**: Built-in revenue sharing mechanisms for IP usage

### 💼 NFT Marketplace Features
- **Gallery View**: Browse all minted music NFTs in an elegant gallery
- **Personal Inventory**: View and manage your owned music NFTs
- **Individual NFT Pages**: Detailed view with audio playback and licensing options

### 🔄 Token Economics
- **IP ↔ WIP Swapping**: Convert between IP tokens and Wrapped IP tokens
- **License Token Minting**: Mint license tokens for commercial use of music IP
- **Dynamic Pricing**: Set custom minting fees for your licenses

### 🎨 Modern UI/UX
- **Dark/Light Theme**: Toggle between themes with system preference detection
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Audio Player**: Built-in audio player with standard controls

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Web3**: Wagmi, RainbowKit, Viem
- **Blockchain**: Story Protocol SDK, Aeneid testnet
- **Storage**: IPFS via Pinata
- **Audio**: MediaRecorder API, Web Audio API

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Web3 wallet (MetaMask recommended)
- Pinata account for IPFS storage
- Story Protocol testnet tokens

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd story-take-home
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   # Pinata Configuration
   PINATA_JWT=your_pinata_jwt_token
   
   # Story Protocol Contract
   NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=your_nft_contract_address
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   Navigate to `http://localhost:3000`

### Environment Variables

- `PINATA_JWT`: Your Pinata API JWT token for IPFS uploads
- `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS`: The deployed NFT contract address on Story Protocol

## 📱 Application Structure

### Pages

- **`/`**: Home page with album recording interface
- **`/gallery`**: Browse all minted music NFTs
- **`/inventory`**: View your owned NFTs (wallet connection required)
- **`/nft/[tokenId]`**: Detailed NFT view with audio playback and licensing
- **`/swap`**: Exchange IP tokens for WIP tokens and vice versa

### Key Components

- **`AlbumRecorder`**: Main recording interface for creating albums
- **`SongRecorder`**: Individual track recording component
- **`WalletProvider`**: Web3 wallet integration with RainbowKit
- **`NavigationHeader`**: Global navigation with wallet connection

## 🎵 How It Works

### 1. Recording Music
1. Connect your Web3 wallet
2. Enter an album name and optionally upload cover art
3. Add songs to your album using the "Add Song" button
4. Record each track using the built-in recorder
5. Preview your recordings before proceeding

### 2. Minting as NFT
1. Once satisfied with your album, click "Create Album"
2. The app uploads all audio files and cover image to IPFS
3. Creates metadata following NFT standards
4. Mints the album as an NFT on Story Protocol
5. Registers the NFT as an IP Asset for licensing

### 3. Managing Your Music
- **Gallery**: View all music NFTs across the platform
- **Inventory**: See only the NFTs you own
- **Individual Pages**: Play music, view details, and manage licenses

### 4. Licensing & Revenue
- Set commercial use terms for your music
- Allow others to mint license tokens for usage rights
- Earn revenue when your music is licensed
- Track usage and revenue through the platform

### 5. Token Economics
- Use the swap page to convert between IP and WIP tokens
- Manage your token balances for various platform operations
- Participate in the Story Protocol ecosystem

## 🎨 User Interface

The application features a modern, clean interface with:
- **Responsive Design**: Works on all device sizes
- **Theme Support**: Dark and light modes with system preference detection
- **Audio Controls**: Intuitive playback controls for music preview
- **Web3 Integration**: Seamless wallet connection and transaction handling

## 🔧 Development

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

### Project Structure

```
story-take-home/
├── app/                    # Next.js 14 app directory
│   ├── api/               # API routes
│   ├── gallery/           # Gallery page
│   ├── inventory/         # User's NFT inventory
│   ├── nft/[tokenId]/     # Individual NFT pages
│   ├── swap/              # Token swap interface
│   └── page.tsx           # Home page
├── components/            # Reusable React components
│   ├── ui/                # shadcn/ui components
│   └── ...                # Custom components
└── lib/                   # Utility functions
```

## 🔐 Security Considerations

- All audio files are stored on IPFS for decentralized access
- Smart contract interactions are handled through established libraries
- Environment variables are properly secured
- Wallet connections use industry-standard protocols

## 🌐 Deployment

The application is ready for deployment on platforms like Vercel:

1. Connect your repository to Vercel
2. Add environment variables in the Vercel dashboard
3. Deploy with automatic builds on git push

## 🔗 Links

- [Story Protocol Documentation](https://docs.story.foundation/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Pinata IPFS Documentation](https://docs.pinata.cloud/)
- [RainbowKit Documentation](https://rainbowkit.com/)

---

Built with ❤️ using Story Protocol and Next.js
