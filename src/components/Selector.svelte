<script lang="ts">
	// Type definitions
	interface CountyItem {
		id: string | number;
		name: string;
		level: 'county';
	}

	interface StateItem {
		id: string | number;
		name: string;
		level: 'state';
		children?: CountyItem[];
	}

	interface RegionItem {
		id: string | number;
		name: string;
		level: 'region';
		children?: StateItem[];
	}

	type HierarchicalItem = RegionItem | StateItem | CountyItem;
	type SelectableItem = CountyItem;

	interface Props {
		data?: RegionItem[];
		selectedItem?: SelectableItem | null;
		placeholder?: string;
	}

	// Props
	let { 
		data = [], 
		selectedItem = $bindable<SelectableItem | null>(null), 
		placeholder = 'Please select a county' 
	}: Props = $props();

	// State variables
	let isOpen = $state<boolean>(false);
	let searchTerm = $state<string>('');
	let inputElement = $state<HTMLInputElement | undefined>();
	let dropdownElement = $state<HTMLDivElement | undefined>();
	let selectContainer = $state<HTMLDivElement | undefined>();
	let justOpened = $state<boolean>(false);
	let filteredData = $state<RegionItem[]>([]);

	function toggleDropdown(): void {
		isOpen = !isOpen;
		
		if (isOpen) {
			justOpened = true;
			setTimeout(() => {
				justOpened = false;
			}, 50);
			
			searchTerm = '';
			setTimeout(() => {
				if (inputElement) {
					inputElement.focus();
				}
				if (dropdownElement) {
					dropdownElement.scrollTop = 0;
					
					if (selectedItem) {
						const selectedElement = dropdownElement.querySelector(`[data-county-id="${selectedItem.id}"]`) as HTMLElement;
						if (selectedElement) {
							const elementTop = selectedElement.offsetTop;
							dropdownElement.scrollTop = elementTop;
						}
					}
				}
			}, 10);
		}
	}

	function selectItem(item: SelectableItem): void {
		selectedItem = item;
		isOpen = false;
		searchTerm = '';
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			isOpen = false;
			searchTerm = '';
		}
	}

	function handleClickOutside(event: MouseEvent): void {
		if (justOpened) {
			return;
		}
		
		if (selectContainer && event.target && !selectContainer.contains(event.target as Node)) {
			isOpen = false;
			searchTerm = '';
		}
	}

	// Handle input click specifically
	function handleInputClick(e: MouseEvent): void {
		e.stopPropagation();
	}

	// Handle select input div click
	function handleSelectClick(e: MouseEvent): void {
		if ((e.target as HTMLElement).tagName === 'INPUT') {
			return;
		}
		toggleDropdown();
	}

	function handleClearClick(e: MouseEvent): void {
		e.stopPropagation();
		selectedItem = null;
	}

	function handleChevronClick(e: MouseEvent): void {
		e.stopPropagation();
		toggleDropdown();
	}

	// Reactive effect for filtering data
	$effect(() => {
		if (!searchTerm.trim()) {
			filteredData = data;
			return;
		}

		const searchLower = searchTerm.toLowerCase();

		const filterHierarchy = (items: RegionItem[]): RegionItem[] => {
			return items.reduce((acc: RegionItem[], item: RegionItem) => {
				let matchingChildren: StateItem[] = [];
				let hasMatchingDescendant = false;

				if (item.children && item.children.length > 0) {
					const filteredStates = item.children.reduce((stateAcc: StateItem[], state: StateItem) => {
						let matchingCounties: CountyItem[] = [];
						let hasMatchingCounty = false;

						if (state.children && state.children.length > 0) {
							matchingCounties = state.children.filter((county: CountyItem) =>
								county.level === 'county' && county.name.toLowerCase().includes(searchLower)
							);
							hasMatchingCounty = matchingCounties.length > 0;
						}

						if (hasMatchingCounty) {
							stateAcc.push({
								...state,
								children: matchingCounties
							});
						}

						return stateAcc;
					}, []);

					if (filteredStates.length > 0) {
						matchingChildren = filteredStates;
						hasMatchingDescendant = true;
					}
				}

				if (hasMatchingDescendant) {
					acc.push({
						...item,
						children: matchingChildren
					});
				}

				return acc;
			}, []);
		};

		filteredData = filterHierarchy(data);
	});
</script>

<svelte:window onkeydown={handleKeydown} onclick={handleClickOutside} />

<div class="select-container" bind:this={selectContainer}>
	<div class="select-input" onclick={handleSelectClick}>
		{#if isOpen}
			<input
				bind:this={inputElement}
				bind:value={searchTerm}
				{placeholder}
				class="filter-input"
				onclick={handleInputClick}
			/>
		{:else}
			<span class="display-text" class:placeholder={!selectedItem}>
				{selectedItem ? selectedItem.name : placeholder}
			</span>
		{/if}

		{#if selectedItem}
			<span class="clear-btn" onclick={handleClearClick}>
				✕
			</span>
		{/if}

		<span class="chevron" onclick={handleChevronClick}>
			{isOpen ? '▲' : '▼'}
		</span>
	</div>

	{#if isOpen}
		<div class="dropdown" bind:this={dropdownElement}>
			<ul>
				{#each filteredData as region (region.id)}
					<li class="region-header">{region.name}</li>
					<ul>
						{#each region.children || [] as state (state.id)}
							<li class="state-header">{state.name}</li>
							<ul>
								{#each state.children || [] as county (county.id)}
									<li 
										class="dropdown-item" 
										data-county-id={county.id}
										onclick={() => selectItem(county)}
									>
										{county.name}
									</li>
								{/each}
							</ul>
						{/each}
					</ul>
				{/each}
			</ul>
		</div>
	{/if}
</div>

<style>
	.select-container {
		position: relative;
		width: 100%;
		max-width: 500px;
	}

	.select-input {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		border: 1px solid #ccc;
		background: white;
		cursor: pointer;
	}

	.display-text {
		flex: 1;
	}

	.display-text.placeholder {
		color: #999;
	}

	.filter-input {
		border: none;
		outline: none;
		flex: 1;
		background: transparent;
	}

	.clear-btn {
		cursor: pointer;
		color: #666;
		font-size: 14px;
		padding: 2px 4px;
		margin-right: 4px;
		border-radius: 2px;
		transition: background-color 0.2s;
	}

	.chevron {
		user-select: none;
		cursor: pointer;
	}

	.dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: white;
		border: 1px solid #ccc;
		border-top: none;
		max-height: 300px;
		overflow-y: auto;
		z-index: 1000;
	}

	.dropdown li {
		height: 20px;
	}

	ul {
		list-style: none;
		padding-inline-start: 20px;
	}

	.dropdown-item {
		cursor: pointer;
	}

	.dropdown-item:hover {
		background-color: #E6F0F6;
	}
</style>