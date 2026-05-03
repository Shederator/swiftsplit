# HisabX 💸

Welcome to **HisabX** (formerly SwiftSplit)! I built this application specifically for my personal friend group to make tracking our shared expenses, settling debts, and splitting bills as seamless (and fun) as possible. Exposed API keys idc.

## Features 🚀

- **Expense Tracking & Bill Splitting**: Easily log shared expenses and see exactly who owes whom in the group.
- **UPI Integration**: Settle up quickly and directly through integrated UPI payments.
- **Real-time Balances**: Powered by Supabase to keep everyone's balances synced and up-to-date in real-time.
- **Haggle Minigame 🎲**: Don't want to pay up immediately or feeling lucky? Settle your debts with the built-in coin-flip "Haggle" minigame! Wager your owed amount and let fate decide (requires two-way confirmation).

## Tech Stack 🛠️

- **Frontend**: Vanilla JavaScript, HTML, and CSS bundled with [Vite](https://vitejs.dev/).
- **Backend & Database**: [Supabase](https://supabase.com/) for database and real-time synchronization.
- **Mobile App**: Packaged into a native Android application using [Capacitor](https://capacitorjs.com/).

## Getting Started 🏁

### Prerequisites
- Node.js (v18+)
- npm 

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Building for Production
To build the web assets:
```bash
npm run build
```

To build the Android APK:
```bash
npx cap sync android
```
*(Open the `android` folder in Android Studio to generate the signed `.apk` file).*

## Why HisabX?
Managing money among friends shouldn't be a hassle or ruin the vibe. This app was custom-tailored for our group's specific needs to ensure accountability, frictionless settlements, and to add a little bit of competitive fun when settling debts.

---
*Built for the group.*
