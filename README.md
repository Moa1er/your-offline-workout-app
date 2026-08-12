# 🏋️ Progressive Workout Tracker

**Your gym, in your pocket. No accounts. No cloud. No excuses.**

Progressive Workout Tracker is a fast, beautiful, fully offline workout logger for Android. Plan routines, log every set with weight, reps and RIR, and let the app track your personal records, volume, and progress — automatically.

> [!TIP]
> 📲 **Download the latest APK from [GitHub Releases](https://github.com/Moa1er/workout-app/releases/latest).** Install it, tap a routine, and start training.

---

## ✨ Why you'll love it

| | |
|---|---|
| **⚡ Log in seconds** | Tap, tap, done. Set checkmarks, automatic rest timers, and previous-lift prefills keep you training, not typing. |
| **🏆 Automatic PRs** | Heaviest weight, most reps at a weight, and best estimated 1RM are detected the moment you complete a set. |
| **📈 Real progress charts** | Volume over time, muscle-by-muscle split, and per-exercise progression — see yourself get stronger. |
| **⏱️ Smart rest timers** | Auto-start between sets, +15s/+30s on demand, and a local notification so you never miss a set. |
| **📋 Routines** | Build reusable templates with target sets, rep ranges, RIR, and rest times. Start one in one tap. |
| **🔁 Hevy compatible** | Import your entire Hevy history (supersets included) or export back. Switch anytime. |
| **🔒 100% yours** | Everything lives in a local SQLite database on your device. Offline always, private by design. |

---

## 📱 Take a look

| Logging a workout | Rest timer running | PR celebration |
|---|---|---|
| ![Active workout](docs/screenshots/active-workout.png) | ![Rest timer](docs/screenshots/rest-timer.png) | ![PR toasts](docs/screenshots/pr-toast.png) |

| Home & routines | Workout complete | History |
|---|---|---|
| ![Home](docs/screenshots/home.png) | ![Summary](docs/screenshots/summary.png) | ![History](docs/screenshots/history.png) |

| Progress overview | Charts & records | Session detail |
|---|---|---|
| ![Progress](docs/screenshots/progress.png) | ![Progress charts](docs/screenshots/progress-charts.png) | ![Session detail](docs/screenshots/session-detail.png) |

| Templates | Template editor | Exercise picker |
|---|---|---|
| ![Templates](docs/screenshots/templates.png) | ![Template editor](docs/screenshots/template-editor.png) | ![Exercise picker](docs/screenshots/exercise-picker.png) |

| Settings & data tools |
|---|
| ![Settings](docs/screenshots/settings.png) |

---

## 🚀 Getting started

1. Download the APK from **[GitHub Releases](https://github.com/Moa1er/workout-app/releases/latest)**.
2. Open the file and allow installation from your browser or file manager when prompted.
3. Launch **Progressive Workout Tracker**, tap a routine, and go lift.

New to the app? Install the built-in **Full Upper Body** routine on first launch, or import years of history from a Hevy CSV export in **Settings → Import Data from Hevy (CSV)**.

---

## 🛠️ Features in detail

- **Active workout screen** — exercise-by-exercise set tables with weight (kg/lb), reps, RIR, set type cycling (Working / Warm-up / Failure / Drop set), exercise notes, and per-exercise rest overrides.
- **Workout recovery** — close the app mid-workout and pick up exactly where you left off, even after a reboot.
- **Rest timer** — auto-starts after every set (or after an exercise), with haptics, sound, a floating +15s/+30s/SKIP overlay, and a local notification.
- **Personal records** — three automatic PR types per exercise, recalculated on every finished session, with celebration toasts as you earn them.
- **Progress dashboard** — training overview, total volume over time, muscle volume split, per-exercise charts (best weight / estimated 1RM / volume), and a PR timeline.
- **History** — paginated session history with duration, working sets, volume, and full set-level detail.
- **Templates** — create, edit, duplicate, and delete routines with target sets, rep ranges, RIR, and rest times.
- **Data ownership** — export everything as a versioned JSON backup, export CSV history, and import/export Hevy CSV.

---

## 🔐 Privacy

No account. No ads. No trackers. No network permission required. Your training data stays in a local SQLite database on your phone, and the only files that ever leave your device are the backups *you* choose to export.

---

## 🧑‍💻 For developers

Architecture, data model, build instructions, and testing live in **[TECHNICAL.md](TECHNICAL.md)**.

---

## 📄 License

MIT — see [LICENSE](LICENSE).

*Made with Expo, React Native, and SQLite.*
