# Changelog

This project follows the basic format of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). For tagged releases, use the version from the Git tag. The tagged release is maintained by the release owner in this English `CHANGELOG.md`; daily user-perceivable changes are recorded in the Chinese `CHANGELOG-zh.md` in this repository. Both files contain user-perceivable facts only and ship in the npm package.

For new releases, use headings in the format `## [x.y.z] - YYYY-MM-DD`. When an entry can be linked unambiguously to a GitHub issue, append `(#xx)`. Historical entries keep their original heading format.

## [Unreleased]

## [0.2.3] - 2026-11-25

### Changed

- All six TinyFish tools load on Pi 1.6.0. `tinyfish_fetch` now forwards `imageLinks` when requesting image links.

## [0.2.2] - 2026-07-16

### Changed

- **Human-readable tool-result projection**: TinyFish events and run results now use a full text field tree; summaries are shown by default, and expanding no longer displays raw JSON.
