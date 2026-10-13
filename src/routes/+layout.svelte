<script lang="ts">
    import { browser } from "$app/environment";
    import { onMount } from "svelte";
    import ServerSwitcher from "$lib/components/ServerSwitcher.svelte";
    import { initializeTooling } from "$lib/state.js";

    let { children } = $props();

    onMount(() => {
        if (browser) initializeTooling();
    });
</script>

{@render children()}

<!-- Server Switcher - only show in browser -->
{#if browser}
    <ServerSwitcher />
{/if}
