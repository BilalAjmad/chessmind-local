# 🏷️ How to publish a release

One-time setup → then every release is literally **two commands**.

## 1. Put the code on GitHub (one time only)

```bash
cd chessmind-local

git init
git add .
git commit -m "ChessMind Local v1.0.7"
git branch -M main

# create an empty repo named "chessmind-local" on github.com first, then:
git remote add origin https://github.com/YOUR-USERNAME/chessmind-local.git
git push -u origin main
```

(Or use the GitHub Desktop app: `File → Add Local Repository` → `Publish repository` — zero terminal.)

> Optional but recommended: replace `your-username` in `package.json → homepage` with your real GitHub username.

## 2. Cut a release

```bash
# 1) bump the version in package.json → "version": "1.0.8"
git add . && git commit -m "v1.0.8"

# 2) tag and push the tag
git tag v1.0.8
git push origin main --tags
```

That tag push triggers **Release** (`.github/workflows/release.yml`):

1. builds the static site once,
2. packages Windows (x64 + arm64), macOS (x64 + arm64), Linux (AppImage + deb) via Electron,
3. builds a release APK via Gradle (Capacitor),
4. publishes **everything** to a new GitHub Release with auto-generated notes.

Watch it live: repo → **Actions** tab → *Release*. ~15 minutes.

## 3. Verify

Open the repo → **Releases** → your tag. You should see:

| File | Platform |
| --- | --- |
| `ChessMind-Local-Setup-1.0.8-x64.exe` | Windows installer (one-click) |
| `ChessMind-Local-Setup-1.0.8-arm64.exe` | Windows ARM installer |
| `ChessMind-Local-1.0.8-arm64.dmg` / `-x64.dmg` | macOS |
| `ChessMind-Local-1.0.8-x86_64.AppImage` | Linux |
| `ChessMind-Local-1.0.8-amd64.deb` | Linux (Debian/Ubuntu) |
| `ChessMind-Local-1.0.8.apk` | Android |

Anyone in the world can now install the game from your Releases page — nothing else to configure.

## Notes

- **CI runs automatically** — you never build installers on your own machine.
- **No secrets needed**: the release uses the built-in `GITHUB_TOKEN`.
- **macOS builds are unsigned** (no $99 Apple developer certificate): the first launch needs *right-click → Open*. That's normal for indie apps.
- **CI (`ci.yml`) also runs lint + typecheck + build + engine tests on every push**, so broken code never reaches a tag.
