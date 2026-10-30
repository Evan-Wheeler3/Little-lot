# Little Lot

A cozy isometric parking lot idle tycoon. Drivers park, shop and pay you. Tap to make everyone hustle, build a garage and a car wash, hire staff, and franchise your way across the map.

Plain HTML, CSS and JavaScript with no framework. It runs in any browser and ships to the App Store as an iOS app through [Capacitor](https://capacitorjs.com).

## What is in the game

- **Core loop**: cars drive up the entry lane, park, the driver walks to the market, shops, walks back, pays and leaves by the exit lane. Every step can be upgraded.
- **Tap to hustle**: steady tapping fills the hustle meter, which multiplies all income (x3 at first, up to x20 with the Hustle power token upgrade). It drains slowly when you stop.
- **A lot that grows physically**: bays fill a row of 10, then new rows open and the market moves back. The road widens from a two-lane street to a four-lane avenue, a boulevard and a six-lane highway with through traffic. The market grows from a corner store to a mega mall. The car wash adds lanes. Reputation brings nicer cars, from small beaters to supercars. The town fills in house by house as you level up.
- **Camera**: pinch or scroll to zoom, drag to look around, tap the target button to come back.
- **Upgrades** in four tabs (Build, Speed, Money, Staff). Every card says what it does, shows Now and Next with real numbers, and names the next landmark (a new row, a bigger building, another wash lane, a new class of car, a milestone doubling).
- **Staff** with long upgrade lines: concierge (golden cars), promoter (rush hours), hype crew (slower meter drain), night manager (away earnings).
- **Goals**: nine endless goal lines that pay cash and gems.
- **Franchising (prestige)**: sell the lot for a bigger **income bonus** and **tokens**. Tokens buy permanent upgrades in the token shop. Nothing else to track.
- **Map**: every franchise opens the next location (Palm Beach, Downtown, Frosty Peaks, Cactus Springs, Neon City, Harbor Point, then laps), each with its own look and perk.
- **Away earnings**: the lot earns while closed (40% speed for 4 hours at first, both upgradeable), with an option to double it for gems.
- **Daily gift**: a seven-day streak calendar.
- **Gems and shop**: earned from goals, golden cars, franchising and daily gifts. Spend them on x2 income, time warps, a hustle lock and golden car parades. Gem packs, a Golden Pass and a starter pack are in-app purchases in the iOS app.
- **Battery friendly**: the still parts of the world are drawn once into a cached layer, the game runs at 60 fps only while you are touching it (30 fps otherwise, never 120), and Settings has a Battery saver that caps it at 30 fps with a lighter resolution.
- **Polish**: day and night with lights, cloud shadows, smooth steering and braking, synthesized sound and music, haptics, a short tutorial, settings, and reduced motion support.
- **Accounts** (optional): email sign-in with cloud saves through Supabase, password reset, and in-app account deletion.

## Files

- `index.html`, `style.css`: the page
- `src/`: the game's source files, in load order. Run `./build.sh` after editing to rebuild `game.js`
- `game.js`: the built game that the page loads
- `auth.js`: email accounts and cloud saves
- `config.js`: your Supabase project, website address, purchase ids and support email
- `supabase.sql`: the database table and the account deletion function
- `assets/`: fonts (SIL Open Font License) and icons
- `manifest.webmanifest`, `sw.js`: install-to-home-screen and offline support for the web version
- `privacy.html`: the privacy policy page
- `ios/`: the Xcode project made by Capacitor
- `store/`: App Store screenshots and the submission guide ([store/APP_STORE.md](store/APP_STORE.md))
- `scripts/sim.js`: balance simulator

## Run it locally

```
./build.sh
python3 -m http.server 8000
```

Then open http://localhost:8000. Add `?debug` to the address to expose the game state as `window.__ll` in the browser console.

## Build the iOS app

You need a Mac with Xcode and CocoaPods (`sudo gem install cocoapods` or `brew install cocoapods`).

```
npm install
npm run ios
```

This rebuilds the game, copies it into `www/`, syncs it into the Xcode project, installs the native plugins and opens Xcode. Pick your team under **Signing & Capabilities**, add the **In-App Purchase** capability, and run it on a device. The full release checklist is in [store/APP_STORE.md](store/APP_STORE.md).

After changing the game, run `npm run sync` to copy the new build into the app.

## Turn on accounts (about 5 minutes)

1. Create a free project at https://supabase.com.
2. In the dashboard open **SQL Editor**, paste `supabase.sql`, and run it. This makes the saves table and the `delete_my_account` function the game uses for in-app account deletion.
3. Open **Project Settings > API** and copy the **Project URL** and the **anon / publishable key** into `config.js`. Both are safe to publish. The table rules in step 2 keep every account's save private.
4. Set `SITE_URL` in `config.js` to where the web version lives (for example `https://YOUR-NAME.github.io/little-lot/`). Email links from inside the iOS app open there.
5. Open **Authentication > URL Configuration**. Set **Site URL** to the same address and add it under **Redirect URLs**.
6. Optional: under **Authentication > Providers > Email**, turn off **Confirm email** if you want people to play the moment they sign up.

Supabase's built-in email sender is limited to a few emails an hour, which is fine for testing. Before launch, add your own SMTP provider under **Authentication > SMTP Settings** (Resend, Postmark and Brevo all have free tiers).

## How saving works

- Guests save on the device. Creating an account carries that progress into the account.
- Signed-in players save to their account every few seconds of play and when the app closes.
- Each account has its own slot on a device, so two people can share one.
- If you play on two devices, the copy with more total progress wins.
- Settings > Reset progress also resets the cloud copy for signed-in players.

## Balancing

`node scripts/sim.js 3 2` plays three hours at high speed with a bot that taps twice a second, and prints the pace (it needs Playwright). From the last run:

- The first upgrade comes within seconds; the first garage floor around 3 to 4 minutes; the build-out (garage at its floor cap, car wash, second row of bays) takes about 10 to 15 minutes.
- The first franchise is worth taking around 20 minutes for an active player, later ones every 20 to 25 minutes, each run getting further.

Franchise points come from lifetime earnings (the first at $3M, then the 4th root), so each run is quicker than the last without running away. Rewards (goal cash, time warps, gifts) are spending money and do not count as earnings, which stops reward loops.

## Publish the web version on GitHub Pages

Push to a repository, then open **Settings > Pages**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save. The site appears at `https://YOUR-NAME.github.io/REPO-NAME/` after a minute. Bump `VERSION` in `sw.js` when you publish an update so returning players get it.
