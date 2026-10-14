## CCPorted

The production build mirrors complete folders for the most-played online games
from the pinned `ccported/games` source revision into `/mirrored-games/`. The mirror
is capped at 500 MiB to leave room under GitHub Pages' site-size limit; game folders
are selected by play count, and games not included in the mirror continue to use the
configured external servers. The build generates `/mirrored-games.json` to route
mirrored games to the local files.
