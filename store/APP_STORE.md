# Shipping Little Lot to the App Store

Everything in the repository is ready. What is left needs your Apple account, your Mac and your decisions (bundle id, prices, support email). Work through this list top to bottom.

## 1. Accounts and ids (one time)

- [ ] Join the [Apple Developer Program](https://developer.apple.com/programs/) ($99 a year).
- [ ] Pick a bundle id you own, for example `com.yourname.littlelot`. Put it in **three** places:
  - `capacitor.config.json` → `appId`
  - `config.js` → `IAP_PREFIX`
  - Xcode → App target → **Signing & Capabilities** → Bundle Identifier
- [ ] In `config.js`, set `SUPPORT_EMAIL` (shown in Settings) and `SITE_URL` (where the web version and privacy policy are hosted).
- [ ] Publish the web version (GitHub Pages works, see the README) so `privacy.html` has a public address. App Store Connect needs this privacy policy URL.

## 2. Accounts backend (optional but recommended)

- [ ] Follow "Turn on accounts" in the README. Run the **whole** `supabase.sql`, including `delete_my_account`: Apple rejects apps that let people create an account without a way to delete it in the app (guideline 5.1.1(v)). The Delete my account button is in the account dialog.
- [ ] Add a real SMTP sender in Supabase before launch.
- If you skip accounts, leave `SUPABASE_URL` empty. The game hides sign-in and works fully offline.

## 3. In-app purchases

Create these in App Store Connect → your app → **Monetization → In-App Purchases** (ids use your bundle id as the prefix):

| Product id | Type | Suggested price | What it gives |
| --- | --- | --- | --- |
| `<bundle id>.gems.small` | Consumable | $0.99 | 100 gems |
| `<bundle id>.gems.medium` | Consumable | $4.99 | 550 gems |
| `<bundle id>.gems.large` | Consumable | $9.99 | 1,200 gems |
| `<bundle id>.gems.huge` | Consumable | $19.99 | 3,200 gems |
| `<bundle id>.goldenpass` | Non-consumable | $6.99 | x2 income forever, double away time, +5 gems per daily gift |
| `<bundle id>.starter` | Non-consumable | $1.99 | 300 gems and 4 hours of x2 income, once |

- [ ] Each needs a display name, description and a review screenshot (use one of the shop screenshots).
- [ ] Sign the **Paid Apps Agreement** and fill in banking and tax, or purchases will not load.
- [ ] In Xcode add the **In-App Purchase** capability.
- [ ] Test with a Sandbox account (Settings → App Store → Sandbox Account on the device) or a StoreKit configuration file.
- The game shows the real localized prices from the App Store once products load. **Restore purchases** is in both the Shop and Settings (required for non-consumables).
- Purchases are granted on the device without server receipt validation. That is common for single-player games. If you want validation later, `cordova-plugin-purchase` supports a validator URL (for example a free [iaptic](https://www.iaptic.com) account): set `store.validator` in `src/11-store.js`.

## 4. Build and upload

On a Mac with Xcode and CocoaPods:

```
npm install
npm run ios        # builds the game, syncs it into ios/, runs pod install, opens Xcode
```

- [ ] Xcode → App target → **General**: set Version (1.0.0) and Build (1). Bump Build for every upload.
- [ ] **Signing & Capabilities**: choose your team and add In-App Purchase. Push Notifications is not needed: reminders are local notifications.
- [ ] Run on a real iPhone. Check: tapping, pinch zoom, sound after the first tap, vibration, a reminder after backgrounding (allow notifications when asked after the tutorial), Restore purchases.
- [ ] Product → **Archive** → Distribute App → App Store Connect → Upload.
- [ ] Try it through **TestFlight** before submitting.

The project already sets: portrait-only on iPhone, all orientations on iPad, `ITSAppUsesNonExemptEncryption = NO` (no export compliance questions), the app icon and the launch screen.

## 5. App Store Connect listing

**Name**: Little Lot: Parking Tycoon
**Subtitle** (30 characters max): Tap, park and build an empire
**Category**: Games → Simulation (secondary: Casual)
**Age rating**: 4+ (no objectionable content; select "In-App Purchases" where asked)
**Price**: Free

**Promotional text** (can change any time):
Tap to hustle, hit FEVER, and turn one little parking lot into a franchise that stretches from the beach to Neon City.

**Description**:

```
Run the coziest parking lot in town!

Drivers pull in, park, pop into the market and pay you on the way out. Tap the lot to make everyone hustle, fill the meter to trigger FEVER for double speed and double cash, and watch your little lot grow into a parking empire.

TAP TO HUSTLE
Every tap drops coins and speeds up the whole lot. Fill the hustle meter and hit FEVER!

BUILD UP AND OUT
Paint more bays, stack garage floors, open a car wash with spinning brushes, and install EV chargers. Every upgrade shows up on your lot.

UPGRADE EVERYTHING
Parking fees, advertising, wider lanes, faster sidewalks, express shopping, valets and shop deals. Endless upgrades with milestone bonuses.

HIRE STAFF
A concierge to greet golden cars, a promoter for rush hour, a hype crew and a night manager keep the lot running for you.

FRANCHISE ACROSS THE MAP
Sell your lot for stars and open the next one: Palm Beach, Downtown, Frosty Peaks, Cactus Springs, Neon City and Harbor Point. Each stop pays more and has its own perk.

EARN WHILE YOU ARE AWAY
Your lot keeps parking cars while you are gone. Come back to a pile of cash, a daily gift and new goals to chase.

LITTLE TOUCHES
Day turns to night and the lot lights up. Golden cars, rush hours, cloud shadows, eight kinds of cars, cheerful music and satisfying sounds.

No ads. Play offline. Optional account to sync between devices.
```

**Keywords** (100 characters max):
`idle,tycoon,parking,clicker,incremental,cars,tap,simulation,manager,city,builder,cozy,offline,empire`

**Support URL**: your site, or a page with your support email
**Privacy policy URL**: `<SITE_URL>privacy.html`

**Screenshots** (already made, in `store/screenshots/`):
- iPhone 6.7" (1290 × 2796): `iphone67-1-hustle.png` … `iphone67-5-night.png`
- iPad 13" (2064 × 2752): `ipad13-1-hustle.png` … `ipad13-5-night.png`

Regenerate them after visual changes with the Playwright script described in the README, or take them from the simulator.

## 6. App Privacy answers

In App Store Connect → **App Privacy**:

- **Tracking**: No, the app does not track users.
- If accounts are switched on, declare:
  - **Contact Info → Email Address**: used for App Functionality, linked to the user, not used for tracking.
  - **User Content → Other User Content** (the game save): App Functionality, linked to the user, not used for tracking.
- **Purchases**: handled by Apple; if asked, Purchase History is used for App Functionality, not tracking.
- If accounts are off, choose "Data Not Collected".

## 7. Review notes

Paste into **App Review Information → Notes**:

```
Little Lot is a single-player idle game. No login is required: tap "Keep playing" in the account dialog or just play.
Optional accounts (email) sync saves; they can be deleted in-app via the account button (top right) → Delete my account.
In-app purchases are in the Shop (bottom right). Restore Purchases is in the Shop and in Settings.
Reminders are local notifications, requested after the tutorial.
```

If accounts are on, also give the reviewer a demo email and password.

## 8. After launch

- Bump `VERSION` in `src/01-state.js` and `sw.js` for every release, and the Build number in Xcode.
- Run `node scripts/sim.js` after changing costs or rewards to check the pace still holds.
- Watch crash reports and reviews in App Store Connect; consider adding analytics only with a privacy label update.
