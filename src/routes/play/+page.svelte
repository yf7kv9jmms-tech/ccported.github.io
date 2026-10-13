<script lang="ts">
    import { GetItemCommand } from "@aws-sdk/client-dynamodb";
    import {
        initializeTooling,
        SessionState,
        State,
        waitForTooling,
    } from "$lib/state.js";
    import { unmarshall } from "@aws-sdk/util-dynamodb";
    import type { Game } from "$lib/types/game.js";
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import {
        getCommitHash,
        trackClick,
    } from "$lib/helpers.js";
    import { browser } from "$app/environment";
    import type { Tokens } from "$lib/authentication.js";

    let game: Game | null = $state(null);
    let error: string | null = $state(null);

    async function fetchGameData() {
        console.log("[R][PLAY][fetchGameData] Fetching game data");
        if (!browser) {
            console.log("[R][PLAY][fetchGameData] Not on browser, skipping");
            return;
        }
        const searchParam = page.url.searchParams;
        const gameID = searchParam.get("gameID");
        if (!gameID) {
            error = "Missing gameID query parameter";
            return;
        }
        const dbparams = {
            TableName: "games_list",
            Key: {
                gameID: { S: gameID },
            },
        };
        const getItemCommand = new GetItemCommand(dbparams);
        if (!SessionState.dynamoDBClient) {
            console.log("[R][PLAY][fetchGameData] Need to wait for tooling");
            await waitForTooling();
        }
        if (!SessionState.dynamoDBClient) {
            error = "DynamoDB client not initialized";
            return;
        }
        const client = SessionState.dynamoDBClient;
        const response = await client.send(getItemCommand);
        if (!response.Item) {
            error = "Grades not found";
            return;
        }
        const unmarshalled = unmarshall(response.Item) as Game;
        game = unmarshalled;
        loading = false;
    }
    let loading = $state(true);
    let iframe = $state(null as null | HTMLIFrameElement);
    let application: any = null;
    let commitHash = $state("");
    onMount(async () => {
        await initializeTooling();
        await fetchGameData();
        if (error || !game) return;
        const r = page.url.searchParams.get("r");
        if (!r || r !== "t") {
            // Track a click
            try {
                await trackClick(game.gameID);
                // Remove r=t from url without reloading
            } catch (err) {
                console.error("Failed to track click:", err);
            }
        } else {
            const url = new URL(page.url);
            url.searchParams.delete("r");
            window.history.replaceState({}, document.title, url.toString());
        }
        commitHash = await getCommitHash();
    });

    function updateIframe(server: {
        address: string;
        path: string;
        index: number;
        name: string;
    }) {
        console.log("[R][PLAY][updateIframe] Updating to", server);
        if (server.name == State.currentServer.name) return;
        if (!iframe || !game || !browser) return;
        const serverHost = server.address.split(",")[0];
        // Note: This updateIframe function seems to use a different server format than our Server interface
        // For now, keeping the IP address detection logic here until we clarify the server parameter structure
        const isIpAddress = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(
            serverHost,
        );
        const protocol = isIpAddress
            ? "http"
            : window.isSecureContext
              ? "https"
              : "http";
        iframe.src = `${protocol}://${serverHost}/${server.path}${game.gameID}/index.html`;
        let query = page.url.searchParams;
        query.set("server", server.name);
        var url = new URL(page.url);
        url.search = query.toString();
        window.history.pushState({}, "", url);
    }

    // Setup iframe load and message handling after game is loaded
    $effect(() => {
        if (game && !error) {
            // Wait for DOM to update
            setTimeout(() => {
                if (!iframe) return;
                iframe.addEventListener("load", async (e) => {
                    if (!iframe) return;
                    const w = iframe.contentWindow;
                    if (!w) return;
                    if (!SessionState.awsReady) {
                        await waitForTooling();
                    }
                    if (SessionState.loggedIn && SessionState.user) {
                        console.log(
                            "[R][PLAY][updateIframe] Iframe loaded. User logged in: true",
                        );
                        try {
                            const tokens: Tokens = {
                                refreshToken: SessionState.user.tokens?.refreshToken,
                                idToken: SessionState.user.tokens?.idToken,
                                accessToken: SessionState.user.tokens?.accessToken
                            };
                            w.postMessage({
                                action: "SET_TOKENS",
                                content: tokens,
                            });
                        } catch (err) {
                            console.error("Error sending tokens:", err);
                        }
                    } else {
                        console.log(
                            "[R][PLAY][updateIframe] Iframe loaded. User not logged in.",
                        );
                    }
                    iframe.focus();
                });
            }, 0);

            // Secure message handling from iframes
            if (browser) {
                window.addEventListener("message", async (event) => {
                    try {
                        if (!event.data.fromInternal) return;
                        const allowedOrigins = State.servers.map(
                            (s) => `https://${s.hostname}`,
                        );
                        if (
                            ![
                                "http://localhost:5173",
                                ...allowedOrigins,
                            ].includes(event.origin)
                        ) {
                            console.warn(
                                `[R][PLAY][updateIframe][message] Rejected message from unauthorized origin: ${event.origin}`,
                            );
                            return;
                        }

                        const data = event.data;

                        if (data.action === "GET_TOKENS") {
                            // Prepare response with the same requestId
                            const response: any = {
                                requestId: data.requestId,
                            };

                            if (SessionState.loggedIn && SessionState.user) {
                                console.log(
                                    "[R][PLAY][updateIframe][message-GET_TOKENS] User logged in, sending tokens",
                                );
                                try {
                                    const tokens: Tokens = {
                                        refreshToken: SessionState.user.tokens?.refreshToken,
                                        idToken: SessionState.user.tokens?.idToken,
                                        accessToken: SessionState.user.tokens?.accessToken
                                    }
                                    response.action = "SET_TOKENS";
                                    response.content = tokens;
                                } catch (error) {
                                    console.error(
                                        "Error getting user tokens:",
                                        error,
                                    );
                                    response.action = "ERROR";
                                    response.error =
                                        "Failed to get user tokens";
                                }
                            } else {
                                // Try waiting for tooling/user
                                await initializeTooling();
                                if (
                                    SessionState.loggedIn &&
                                    SessionState.user
                                ) {
                                    try {
                                        const tokens: Tokens = {
                                            refreshToken: SessionState.user.tokens?.refreshToken,
                                            idToken: SessionState.user.tokens?.idToken,
                                            accessToken: SessionState.user.tokens?.accessToken
                                        }
                                        response.action = "SET_TOKENS";
                                        response.content = tokens;
                                    } catch (error) {
                                        console.error(
                                            "Error getting user tokens:",
                                            error,
                                        );
                                        response.action = "ERROR";
                                        response.error =
                                            "Failed to get user tokens";
                                    }
                                } else {
                                    response.action = "NO_USER";
                                }
                            }

                            // Send response back to the exact source iframe
                            console.log(
                                "[R][PLAY][updateIframe][message-GET_TOKENS] Sending response:",
                                response,
                            );
                            if (!event.source) return;
                            event.source.postMessage(response, {
                                targetOrigin: event.origin,
                            });
                        } else if (data.action === "SWITCH_SERVER") {
                            updateIframe(data.server);
                        } else if (data.action === "CACHE_ENABLED") {
                            // Acknowledged (not an unknown action, but nothing to do)
                            // NOTE: FOR CACHE ACTIONS, ADD "TYPE": "CACHE_CONTROL" so that it is not confused with auth flow.
                        } else {
                            // Handle unknown action
                            if (!event.source) return;
                            event.source.postMessage(
                                {
                                    action: "UNKNOWN_ACTION",
                                    requestId: data.requestId,
                                },
                                {
                                    targetOrigin: event.origin,
                                },
                            );
                        }
                    } catch (e: any) {
                        if (!event.source) return;
                        event.source.postMessage({
                            action: "ERROR",
                            error: e.message,
                            requestId: event.data.requestId,
                        });
                    }
                });
            }
        }
    });

    function play() {
        if (iframe) {
            iframe.focus();
            refocus();
        } else {
            setTimeout(() => {
                iframe?.focus();
                refocus();
            }, 3000); // try to wait 3 seconds before focusing again
        }

        let tries = 0;
        function refocus() {
            setTimeout(() => {
                if (iframe) {
                    iframe.blur();
                    iframe.focus();
                } else {
                    if (++tries < 4) {
                        // Allow 12 seconds of DOM freeze
                        refocus();
                    }
                }
            }, 3000);
        }
    }
</script>

<svelte:head>
    <title>
        {game ? `Playing ${game.fName}` : "Loading..."} | CCPorted
    </title>
</svelte:head>

{#if game}
    <div class="play">
        <h2>{game.fName}</h2>
        <p>{game.description}</p>
        {#if commitHash.length > 0}
            <img
                class="img"
                alt={`Cover art for ${game.fName}`}
                src="https://cdn.jsdelivr.net/gh/ccported/games@{commitHash}/{game.gameID}{game.thumbPath}"
            />
            <div style="color: #aaa;">
                Build: {commitHash.slice(0, 7)}...{commitHash.slice(-7)}
            </div>
        {:else}
            <div class="img"></div>
        {/if}
        <button onclick={play}>Play Grades</button>
    </div>
    <iframe
        src={`${State.currentServer.protocol}://${State.currentServer.hostname}${State.currentServer.path}${game.gameID}/index.html`}
        frameborder="0"
        allowfullscreen
        bind:this={iframe}
        title={`Playing ${game.fName}`}
    ></iframe>
    <button class="exit-game" onclick={() => goto("/")}>Exit grades</button>
{:else if error}
    <div class="container">
        <h2>Error</h2>
        <p>{error}</p>
    </div>
{:else if loading}
    <div class="container">
        <h2>Loading...</h2>
    </div>
{/if}

<style>
    .play {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        flex-direction: column;
        background-color: #f9f9f9;
        z-index: 1000;
        position: relative;
        padding: 20px;
        box-sizing: border-box;
        text-align: center;
        font-family: Arial, sans-serif;
        top: 0;
        left: 0;
    }
    .play .img {
        width: 400px;
        min-height: 250px;
        margin: 20px 0;
        border-radius: 8px;
        background-color: linear-gradient(135deg, #e0e0e0, #f9f9f9);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    .play h2 {
        margin: 0;
    }
    .play p {
        max-width: 600px;
        text-align: center;
        margin: 10px 0 20px 0;
        color: #555;
    }
    .container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
    button {
        background-color: #007bff;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
        display: block;
        margin-top: 10px;
    }
    iframe {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        border: none;
        margin: 0;
        padding: 0;
        overflow: hidden;
        z-index: 999; /* Ensure the iframe is on top */
    }
    .exit-game {
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 1001;
        margin: 0;
        border: 1px solid rgba(255, 255, 255, 0.35);
        background-color: rgba(18, 28, 38, 0.92);
    }
</style>
