# The Day of Learning Challenge

**GitHub Day of Learning | 2-hour workshop game challenge | Canvas Extension Edition**

Build **Mona's Octoverse Arcade**: a browser game starring Mona the Octocat as
the hero and Copilot as the sidekick. Ship it as a **Copilot App canvas
extension** that installs and opens inside the Copilot App. Every team starts
from the same prompt, then makes the game its own.

This repository is the shared starter and challenge guide. Your GitHub
Hands-on Labs environment already provides your team's repository based on
this template; use that repository rather than creating another one.
It includes a minimal, working Copilot App canvas extension starter, not a
finished game. Start from it, confirm the canvas opens, then build your game
in the starter's `.github/extensions/monas-octoverse-arcade-starter/game.html`.

**Workshop links:** [Attendee instructions](https://gh.io/dol-instructions) |
[Discussion and submissions](https://gh.io/dol-discussion).
This README is the source of truth for the shared prompt and challenge rules;
the attendee website and Discussion follow the same guidance.

## Prerequisites, login, and add project to the Copilot app

1. **Install the GitHub Copilot app.** Download and install it from
   [github.com/features/copilot](https://github.com/features/copilot).
2. **Log in with your provided lab account.** Open the GitHub Copilot app
   and sign in using the **GitHub Hands-on Labs** account provided to you.
   Use that account, rather than your personal GitHub account, throughout
   the workshop. As part of the GitHub Hands-on Labs environment, a
   repository is already set up for your team, ready to add as a Project.

> [!NOTE]
> All team members should be able to log in with the one account
> provided to work on the repository, or you can have one teammate make
> the changes.

3. **Add your team's repository as a Project in the GitHub Copilot app.**
   In the app's sidebar, open **Projects** and create a new **Project**
   named for your team. In the repository picker, select the repository
   already set up in your GitHub Hands-on Labs environment, not the original
   `ghlearn/day-of-learning-challenge` template. Let the Project prepare the
   repository and wait for its reply that it is ready.

   In the **Project** chat, ask Copilot to start a coding session in your
   team's repository and open the **Mona's Octoverse Arcade starter** canvas.
   Confirm its welcome screen appears and its button responds before building.
   The project-scoped extension is already in the repository; you do not need
   a separate starter download.

Commit and push your team's extension changes so the submitted repository
contains the version shown in your demo.

**Challenge topics:** [Prompt](#prompt) | [Teams](#teams) |
[Canvas extension](#canvas-extension) | [Agenda](#agenda) |
[Submit](#submit) | [Judging](#judging) | [Awards](#awards) |
[Principles](#principles)

## Prompt

Every team starts with this prompt in the Copilot App. It sets the baseline,
not the limit.

```text
In the Mona's Octoverse Arcade starter canvas already included
in your team's challenge repository, build the game described here.

Keep the existing extension registration in extension.mjs;
implement the game in `.github/extensions/monas-octoverse-arcade-starter/game.html` with HTML, CSS, and vanilla
JavaScript, with no external build step.

Make a game where Mona the Octocat collects green commit-squares
while dodging red bugs. Track the score, increase speed over
time, and show a game-over screen with a restart button.

Copilot appears as a sidekick that gives an encouraging tip
every 10 points. Make sure the canvas still opens and the game
is playable.
```

**The baseline**

- Mona collects green commit squares and dodges red bugs.
- The score is tracked, and the speed increases over time.
- A game-over screen has a restart button.
- Copilot cheers you on with a tip every 10 points.

**Make it yours**

- **Rethink the world:** levels, settings, and a story that make Mona's arcade
  feel like yours.
- **Invent power-ups:** shields, magnets, merge combos, or boss bugs.
- **Give Copilot personality:** make the sidekick funny, helpful, or full of
  surprises.
- **Find your style:** art direction, animation, and sound that make people
  want to keep playing.

## Teams

Up to 150 people may take part. Plan attendance in multiples of 6 so everyone
can join a complete team.

- **Exactly 6 people per team:** no smaller or larger teams.
- **Choose a team name** during kickoff. Use it on your submission.
- **One shared repository:** keep your team's extension in one repository
  that judges can open.

With 150 participants, form 25 teams of 6, for 25 team submissions. If your
group has fewer than 6 people, join another group. If it has more than 6,
split into teams of exactly 6.

## Canvas extension

Your game cannot be a loose HTML file. It must be a **Copilot App canvas
extension** that:

1. **Lives in its own folder**, with an `extension.mjs` that registers a
   canvas (the game UI).
2. **Can be installed** into the Copilot App via `install_extension` from a
   GitHub gist or repository folder, or by placing the folder in the
   extensions directory.
3. **Runs as a canvas** when the agent opens it with `open_canvas`. The game
   renders in the side panel and is playable.

Start from the **included, known-good canvas starter** in
`.github/extensions/monas-octoverse-arcade-starter/`. Its `extension.mjs`
registers and serves the canvas; `.github/extensions/monas-octoverse-arcade-starter/game.html` is the welcome screen and the
place to build your game. Keep these files together. The starter is deliberately
not a playable game: the score, collectibles, bugs, difficulty, and Copilot
tips are yours to implement.

In the Copilot App session opened on your team's repository, ask:

> Open the Mona's Octoverse Arcade starter canvas.

The starter's button confirms that the canvas is interactive. Then paste the
challenge prompt above and build the game in `.github/extensions/monas-octoverse-arcade-starter/game.html`. Use HTML, CSS, and
vanilla JavaScript inside the canvas, with **no external build step**. Keep
the game self-contained: do not add a package manifest, dependencies, or
external assets. The starter handles canvas registration and serving so your
team can focus on the game and still learn how the extension fits together.

**Loading is the setup step:** opening your team's repository as a Project
loads the included project-scoped extension. You do not need a separate
starter download or to reinstall it for the demo. The installation options
above are for trying the extension in another environment.

## Agenda

The workshop lasts **2 hours**. All times below are elapsed from the start
of the workshop, not times of day. Install the app and log in before kickoff.

| Time | Phase | What to do |
| --- | --- | --- |
| 0:00-0:15 | Kickoff & teams | See the target canvas extension, get the starter prompt and rubric, form teams of exactly 6, and choose a team name. |
| 0:15-0:25 | Open the starter | Add the pre-provisioned lab repository as a Copilot App Project, open the included starter canvas, and confirm its button responds. |
| 0:25-1:15 | Build your game | Start from the prompt, then build your team's version inside the canvas with the Copilot App. |
| 1:15-1:35 | Power-up | Pick a stretch goal: leaderboard, sound, animation, theming, or your own idea. |
| 1:35-2:00 | Record & submit | Record a demo video of up to 90 seconds and post your submission in the challenge Discussion before the workshop ends. |

## Submit

Before the end of the **two-hour workshop**, one teammate posts your team's
submission as a **single comment in the
[challenge Discussion](https://gh.io/dol-discussion)**. Do not submit in a
separate Discussion in your team's repository.

Include all four items:

1. **Team name:** the name your team chose at kickoff.
2. **Description:** a few sentences about your game, your creative spin, and
   your power-up.
3. **Demo video:** up to **90 seconds**. Show your team's repository open as
   a Project with the included extension loaded, open the canvas, and play
   the game. No separate reinstallation is required. Attach the video to
   your comment or add a link that judges can access.
4. **Repository link:** your team's repository containing the extension
   folder. Make sure judges can access it and that your changes are pushed.

The repository must contain the version shown in your demo. Keep any lab
credentials out of your video and submission.

You can copy this into your submission comment and replace the placeholders:

```markdown
**Team name:** <your team name>

**Description:** <your game, creative spin, and power-up>

**Demo video:** <attach a video or paste an accessible link; up to 90 seconds>

**Repository:** <URL of your team's repository containing the extension folder>
```

## Judging

After the workshop, judges review every submission's demo video and
repository against this **25-point rubric**. They choose all three award
winners and announce them in the challenge Discussion. **There is no
audience vote.**

| Criteria | Points | What judges look for |
| --- | ---: | --- |
| **It works:** installs & runs as a canvas | 8 | Extension installs, canvas opens, game is actually playable. |
| **Fun factor** | 6 | Is it enjoyable? Would you play again? |
| **GitHub theme** | 5 | Creative use of Mona & Copilot as characters. |
| **Polish** | 3 | Visuals, animations, sound, game-over/restart flow. |
| **Wow / stretch** | 3 | A power-up feature that surprised the judges. |
| **Total** | **25** | |

## Awards

The **judges decide** all three categories. Each category winner takes home
**swag**.

| Award | Recognizes |
| --- | --- |
| **Overall Winner** | Best total rubric score across all criteria. |
| **Best Design** | The best-looking, most visually striking game (Polish). |
| **Most Fun** | The game the judges most wanted to keep playing (Fun factor). |

**Award rollover rule:** a team can win more than one category. However, if
the Overall Winner also tops another category, that second award rolls to
the runner-up to spread the recognition.

## Principles

- **Rubric up front:** teams know what is judged before building.
- **Known-good starter:** a working canvas starter makes "install & run"
  achievable for everyone without giving teams a finished game.
- **Reward working software:** "it works" has the highest weight, with 8 of
  25 points for installing and running as a canvas.
- **Shared theme, personal spin:** every team starts from the same prompt
  and builds Mona's Arcade, then makes it its own.

---

> **Note:** This is an independent workshop resource. It is not an official
> GitHub Universe or GitHub event website and is not endorsed by GitHub.
> GitHub, GitHub Copilot, and the Octocat are trademarks of GitHub, Inc.
> Public-facing mascot use requires approval from GitHub's Brand & Marketing
> Design team under the
> [mascot guidelines](https://brand.github.com/graphic-elements/mascots).
