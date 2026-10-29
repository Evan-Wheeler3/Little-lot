# Little Lot

A cozy isometric parking garage idle tycoon. Plain HTML, CSS and JavaScript, no build step needed to play (editing the game uses a one-line `./build.sh` that joins `src/` into `game.js`).

- `index.html`, `style.css`: the page
- `src/`: the game's source files, in load order. Run `./build.sh` after editing to rebuild `game.js`
- `game.js`: the built game that the page loads (scene, traffic, garage, upgrades, goals, franchise loop, local saving)
- `auth.js`: email accounts and cloud saves
- `config.js`: your Supabase project details (empty until you fill them in)
- `supabase.sql`: the one table the accounts need

Without `config.js` filled in the game still works. Progress saves in the browser, and the account button says accounts are not switched on yet.

## Turn on accounts (about 5 minutes)

1. Create a free project at https://supabase.com.
2. In the dashboard open **SQL Editor**, paste `supabase.sql`, and run it.
3. Open **Project Settings > API** and copy the **Project URL** and the **anon / publishable key** into `config.js`. Both are safe to publish. The table rules in step 2 keep every account's save private.
4. Open **Authentication > URL Configuration**. Set **Site URL** to your GitHub Pages address (for example `https://YOUR-NAME.github.io/little-lot/`) and add the same address under **Redirect URLs**. Confirmation and password reset emails link back there.
5. Optional: under **Authentication > Providers > Email**, turn off **Confirm email** if you want people to play the moment they sign up. Leave it on to verify addresses.

Supabase's built-in email sender is limited to a few emails an hour, which is fine for testing. Before sharing the game widely, add your own SMTP provider under **Authentication > SMTP Settings** (Resend, Postmark and Brevo all have free tiers).

## How saving works

- Guests save in the browser. Creating an account carries that progress into the account.
- Signed-in players save to their account every few seconds of play and when the tab is closed.
- Each account has its own slot on a device, so two people can share a browser.
- If you play on two devices, the copy with more total progress wins. A device that is behind loads the newer save instead of overwriting it.

## Publish on GitHub Pages

Push these files to a repository, then open **Settings > Pages**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save. The site appears at `https://YOUR-NAME.github.io/REPO-NAME/` after a minute.

## Run it locally

```
python3 -m http.server 8000
```

Then open http://localhost:8000.
