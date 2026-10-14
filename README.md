## CCPorted

The emulator data served from `/emdata/` is maintained in the `vendor/emdata`
Git submodule. Initialize it after cloning with
`git submodule update --init --recursive`; the development and production build
scripts copy its data and license into the local static assets. The emulator
loader and core files are therefore served by the site itself rather than by
external data mirrors.

The production build also mirrors complete folders for the most-played online games
from the pinned `ccported/games` source revision into `/mirrored-games/`. The mirror
is capped at 500 MiB to leave room under GitHub Pages' site-size limit; game folders
are selected by play count, and games not included in the mirror continue to use the
configured external servers. The build generates `/mirrored-games.json` to route
mirrored games to the local files.
