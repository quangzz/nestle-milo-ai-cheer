# Project Tech Stack & Architecture Specifications

## Project Overview
- **Project Name:** MILO Helios - "Dịch Vụ Cổ Vũ MILO" Microsite
- **Slogan:** "Việc gì khó, có MILO cổ vũ làm tới cùng!"
- **Type:** Responsive Web Application (Mobile-First 9:16 safezone)

## Tech Stack & Versions
- **Core Framework:** React 18+ (Vite, TypeScript)
- **Styling:** Tailwind CSS v4 + Vanilla CSS Design Tokens (`src/styles/theme.css`)
- **Animation:** `motion` (Framer Motion) for UI pop-ups, text glitch, and Spotify-style karaoke lyrics scrolling
- **Icon Set:** `lucide-react`
- **State Management:** Custom Hook (`useCheerCampaign`) + React Context API (`CheerCampaignContext`)

## Directory Structure
```
/e:/milo
├── .agents/
│   └── rules/
│       └── project-tech-stack.md   # Project-specific rules & architecture
├── public/
│   └── assets/                     # Static images, audio & brand assets
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── layout/            # CampaignLayout, Header, Footer
│   │   │   ├── ui/                # Button, Input, Modal, ProgressRing, AvatarUploader, KaraokePlayer
│   │   │   └── features/          # Frame1Opening, Frame2Onboarding, Frame3TnC, Frame4PhoneOtp, Frame6InfoUpload, Frame7TopicSelect, Frame8Loading, Frame9Outcome
│   │   ├── hooks/                 # useCheerCampaign, useLoadingMessages, useAudioKaraoke
│   │   ├── context/               # CheerCampaignContext
│   │   ├── lib/                   # api.ts (mock backend / Firebase ready)
│   │   ├── utils/                 # constants.ts (12 quotes, 3 chants lyrics), formatters.ts
│   │   └── types/                 # cheer.ts
│   ├── styles/
│   │   ├── theme.css              # Milo Helios Brand Tokens (#005C28, #28A745, #F5A623)
│   │   ├── fonts.css              # Font imports
│   │   └── index.css              # Tailwind v4 & global styles
│   ├── App.tsx                    # Main Wizard Flow Controller
│   └── main.tsx                   # React Entry Point
├── index.html
├── package.json
└── vite.config.ts
```

## State Management Strategy
- **Wizard Navigation:** Managed in `CheerCampaignContext` (Frame 1 to 9).
- **Form State:** `useState` for local inputs (Phone, OTP, Recipient Name), lifted to Context on step completion.
- **Loading State:** 12 dynamic waiting quotes timer (10s intervals over 2 minutes, auto-looping from quote 6).
- **Outcome State:** Karaoke timestamp sync, selected chant topic (Study / Work / Workout), audio playback controls.

## Backend & Integration Specs
- **Client Validation:** Phone number format validation (10 digits), OTP 6-digit auto-verify simulation/API call, Image size & format check (<5MB, JPG/PNG).
- **Rate Limiting / OTP Timer:** 60 seconds countdown for resend OTP.
