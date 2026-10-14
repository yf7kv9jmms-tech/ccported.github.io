<script lang="ts">
    import { page } from "$app/state";
    import { onMount } from "svelte";

    type WindowWithEJS = Window &
        typeof globalThis & {
            EJS_player: string;
            EJS_core: string;
            EJS_pathtodata: string;
            EJS_gameUrl: string;
            // EJS_startOnLoaded: boolean;
        };

    let rom: string | null = $state(null);
    onMount(async () => {
        try {
            const sParams = page.url.searchParams;
            rom = sParams.get("rom");
            let core = sParams.get("core");
            let url;
            if (!rom || !core) throw "No rom or core specified";
            if (rom.startsWith("http") || rom.startsWith("//")) {
                url = rom;
            } else {
                url = `https://ccgstatic.com/romss/${core}/${rom}`;
            }
            (window as WindowWithEJS).EJS_player = "#game";
            (window as WindowWithEJS).EJS_core = core;
            (window as WindowWithEJS).EJS_pathtodata = "/emdata/data/";
            (window as WindowWithEJS).EJS_gameUrl = url;
            // window.EJS_startOnLoaded = true;
            const script = document.createElement("script");
            script.src = "/emdata/data/loader.js";
            document.body.appendChild(script);
        } catch (err) {
            alert(err);
        }
    });
</script>

<svelte:head>
    <title>{rom ? rom : "Emulator"} | CCPorted</title>
</svelte:head>

<div style="width:100%;height:100%;max-width:100%">
    <div id="game"></div>
</div>

<style>
    #game {
        width: 100vw;
        height: 100vh;
    }
</style>
