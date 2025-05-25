<script>
  import data from '$lib/data.json';
	import nestData from '$lib/nestData';
	import Selector from '../components/Selector.svelte';
	const nestedData = $derived(nestData(data));
	
</script>

<main>
	<Selector data={nestedData} />
</main>

<style>
	* {
		font-family: 'Source Sans 3', Arial, Helvetica, sans-serif;
		font-size: 16px;
	}

	main {
		display: flex;
		justify-content: center;
		align-items: flex-start;
		min-height: 100vh;
		width: 100%;
		padding-top: 20vh;
	}
</style>