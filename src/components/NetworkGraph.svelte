<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import metadata from '$lib/metadata.json';
	import colors from '$lib/colors.js';

	// Type definitions
	interface Node {
		productId: string;
		x: number;
		y: number;
		label?: string;
		size?: number;
		color?: string;
		canvasX?: number;
		canvasY?: number;
	}

	interface Link {
		source: string;
		target: string;
		value?: number;
	}

	interface GraphData {
		nodes: Node[];
		links: Link[];
	}

	interface Props {
		data: GraphData;
		width?: number;
		height?: number;
		nodeRadius?: number;
		enableZoom?: boolean;
		showLabels?: boolean;
		padding?: number;
		backgroundColor?: string;
		nodeColor?: string;
		nodeBorderColor?: string;
		nodeBorderWidth?: number;
		linkColor?: string;
		linkOpacity?: number;
		maxNodes?: number; // Add performance limit
		maxLinks?: number; // Add link limit
	}

	let {
		data,
		width = 1200,
		height = 800,
		nodeRadius = 2,
		enableZoom = true,
		showLabels = false,
		padding = 50,
		backgroundColor = '#ffffff',
		nodeColor = '#69b3a2',
		nodeBorderColor = '#CCCCCC',
		nodeBorderWidth = 1,
		linkColor = '#666666',
		linkOpacity = 0.3,
		maxNodes = 10000, // Performance limit
		maxLinks = 15000 // Link limit
	}: Props = $props();

	// State
	let canvas = $state<HTMLCanvasElement>();
	let ctx = $state<CanvasRenderingContext2D | null>(null);
	let xScale = $state<d3.ScaleLinear<number, number>>();
	let yScale = $state<d3.ScaleLinear<number, number>>();
	let transform = $state({ x: 0, y: 0, k: 1 });
	let isLoading = $state(true);
	let hoveredNode = $state<Node | null>(null);
	let nodeMap = $state<Map<string, Node>>(new Map());
	let processedData = $state<{ nodes: Node[]; links: Link[] }>({ nodes: [], links: [] });
	let isProcessing = $state(false);
	let hasRendered = $state(false);

	// Process data 
	function processData() {
		if (isProcessing) return;

		try {
			isProcessing = true;
			console.log('Starting data processing...');

			if (!data || !data.nodes || data.nodes.length === 0) {
				console.log('No data available');
				processedData = { nodes: [], links: [] };
				isProcessing = false;
				return;
			}

			console.log(`Processing ${data.nodes.length} nodes, ${data.links.length} links`);

			// Sample nodes if too many
			let nodesToProcess = data.nodes;
			if (data.nodes.length > maxNodes) {
				const step = Math.floor(data.nodes.length / maxNodes);
				const sampledNodes = [];
				for (let i = 0; i < data.nodes.length && sampledNodes.length < maxNodes; i += step) {
					sampledNodes.push(data.nodes[i]);
				}
				nodesToProcess = sampledNodes;
				console.log(`Sampled down to ${nodesToProcess.length} nodes`);
			}

			// Filter valid nodes
			const validNodes = nodesToProcess.filter(
				(node) =>
					node &&
					node.productId &&
					typeof node.x === 'number' &&
					typeof node.y === 'number' &&
					!isNaN(node.x) &&
					!isNaN(node.y)
			);

			console.log(`${validNodes.length} valid nodes after filtering`);

			const validNodeIds = new Set(validNodes.map((n) => n.productId));

			let linksToProcess = data.links.filter(
				(link) =>
					link &&
					link.source &&
					link.target &&
					validNodeIds.has(link.source) &&
					validNodeIds.has(link.target)
			);

			if (linksToProcess.length > maxLinks) {
				linksToProcess = linksToProcess.slice(0, maxLinks);
			}

			console.log(`${linksToProcess.length} valid links after filtering`);

			processedData = {
				nodes: validNodes,
				links: linksToProcess
			};

			isProcessing = false;
			console.log('Data processing complete');
		} catch (error) {
			console.error('Error processing data:', error);
			processedData = { nodes: [], links: [] };
			isProcessing = false;
		}
	}

	onMount(() => {
		if (canvas) {
			setupCanvas();
			setupEventListeners();
			// Process data once on mount
			setTimeout(() => {
				processData();
			}, 100);
		}
	});

	// Only watch for processed data changes to render
	$effect(() => {
		if (ctx && processedData.nodes.length > 0 && !hasRendered) {
			try {
				console.log('Starting initial render...');
				isLoading = true;
				hasRendered = true;
				updateScales();
				setTimeout(() => {
					render();
					isLoading = false;
					console.log('Initial render complete');
				}, 50);
			} catch (error) {
				console.error('Error in render effect:', error);
				isLoading = false;
			}
		} else if (ctx && processedData.nodes.length === 0 && !isProcessing) {
			isLoading = false;
		}
	});

	function setupCanvas(): void {
		if (!canvas) return;

		const context = canvas.getContext('2d');
		if (!context) return;

		ctx = context;

		// Set canvas size
		canvas.width = width;
		canvas.height = height;

		// Set up high DPI rendering
		const dpr = window.devicePixelRatio || 1;
		canvas.width = width * dpr;
		canvas.height = height * dpr;
		canvas.style.width = width + 'px';
		canvas.style.height = height + 'px';
		ctx.scale(dpr, dpr);

		// Don't set isLoading = false here, let the effect handle it
	}

	function updateScales(): void {
		try {
			if (!processedData.nodes.length) return;

			const xExtent = d3.extent(processedData.nodes, (d: Node) => d.x) as [number, number];
			const yExtent = d3.extent(processedData.nodes, (d: Node) => d.y) as [number, number];

			xScale = d3
				.scaleLinear()
				.domain(xExtent)
				.range([padding, width - padding]);

			yScale = d3
				.scaleLinear()
				.domain(yExtent)
				.range([padding, height - padding]);

			// Pre-calculate canvas coordinates and create node map
			const newNodeMap = new Map<string, Node>();
			processedData.nodes.forEach((node) => {
				if (xScale && yScale) {
					node.canvasX = xScale(node.x);
					node.canvasY = yScale(node.y);
					newNodeMap.set(node.productId, node);
				}
			});
			nodeMap = newNodeMap;
			console.log('Scales updated');
		} catch (error) {
			console.error('Error updating scales:', error);
		}
	}

	function render(): void {
		if (!ctx || !xScale || !yScale) return;

		try {
			// Clear canvas
			ctx.fillStyle = backgroundColor;
			ctx.fillRect(0, 0, width, height);

			// Apply transform
			ctx.save();
			ctx.translate(transform.x, transform.y);
			ctx.scale(transform.k, transform.k);

			// Render links first (so they appear behind nodes)
			renderLinks();

			// Render nodes
			renderNodes();

			// Render labels if enabled and zoomed in enough
			if (showLabels && transform.k > 2) {
				renderLabels();
			}

			// Render hovered node info
			if (hoveredNode) {
				renderTooltip();
			}

			ctx.restore();
		} catch (error) {
			console.error('Error in render:', error);
		}
	}

	// Public render function for interactions (doesn't trigger effects)
	function redraw(): void {
		if (hasRendered) {
			render();
		}
	}

	function renderLinks(): void {
		if (!ctx || !nodeMap) return;

		try {
			if (processedData.links.length === 0) return;

			// Separate normal links from highlighted links
			const normalLinks: Link[] = [];
			const highlightedLinks: Link[] = [];

			if (hoveredNode) {
				processedData.links.forEach((link) => {
					if (link.source === hoveredNode.productId || link.target === hoveredNode.productId) {
						highlightedLinks.push(link);
					} else {
						normalLinks.push(link);
					}
				});
			} else {
				normalLinks.push(...processedData.links);
			}

			// Render normal links first
			if (normalLinks.length > 0) {
				ctx.strokeStyle = linkColor;
				ctx.globalAlpha = linkOpacity;
				ctx.lineWidth = 1;
				ctx.beginPath();

				// Process normal links in chunks
				const chunkSize = 1000;
				for (let i = 0; i < normalLinks.length; i += chunkSize) {
					const chunk = normalLinks.slice(i, i + chunkSize);
					chunk.forEach((link) => {
						const sourceNode = nodeMap.get(link.source);
						const targetNode = nodeMap.get(link.target);

						if (
							sourceNode?.canvasX &&
							sourceNode?.canvasY &&
							targetNode?.canvasX &&
							targetNode?.canvasY &&
							ctx
						) {
							ctx.moveTo(sourceNode.canvasX, sourceNode.canvasY);
							ctx.lineTo(targetNode.canvasX, targetNode.canvasY);
						}
					});
				}
				ctx.stroke();
			}

			// Render highlighted links with red color and 3px thickness
			if (highlightedLinks.length > 0) {
				ctx.strokeStyle = 'red';
				ctx.globalAlpha = 1; // Full opacity for highlighted links
				ctx.lineWidth = 3;
				ctx.beginPath();

				highlightedLinks.forEach((link) => {
					const sourceNode = nodeMap.get(link.source);
					const targetNode = nodeMap.get(link.target);

					if (
						sourceNode?.canvasX &&
						sourceNode?.canvasY &&
						targetNode?.canvasX &&
						targetNode?.canvasY &&
						ctx
					) {
						ctx.moveTo(sourceNode.canvasX, sourceNode.canvasY);
						ctx.lineTo(targetNode.canvasX, targetNode.canvasY);
					}
				});
				ctx.stroke();
			}

			ctx.globalAlpha = 1; // Reset global alpha
		} catch (error) {
			console.error('Error rendering links:', error);
		}
	}

	function renderNodes(): void {
		if (!ctx || !nodeMap) return;

		try {
			// Get connected node IDs if there's a hovered node
			const connectedNodeIds = new Set<string>();
			if (hoveredNode) {
				processedData.links.forEach((link) => {
					if (link.source === hoveredNode.productId) {
						connectedNodeIds.add(link.target);
					} else if (link.target === hoveredNode.productId) {
						connectedNodeIds.add(link.source);
					}
				});
			}

			// Process nodes in chunks
			const chunkSize = 800;
			for (let i = 0; i < processedData.nodes.length; i += chunkSize) {
				const chunk = processedData.nodes.slice(i, i + chunkSize);
				chunk.forEach((node) => {
					if (node.canvasX && node.canvasY && ctx) {
						const radius = nodeRadius;

						// Determine node color
						let nodeColorToUse = node.color || nodeColor; // Default fallback

						// Look up product info to get sector color
						const productInfo = metadata.productHs92.find((p) => p.productId === node.productId);
						if (productInfo && productInfo.productSector && productInfo.productSector.productId) {
							const sectorColor = colors.get(productInfo.productSector.productId);
							if (sectorColor) {
								nodeColorToUse = sectorColor;
							}
						}

						// Fill the node
						ctx.fillStyle = nodeColorToUse;
						ctx.beginPath();
						ctx.arc(node.canvasX, node.canvasY, radius, 0, 2 * Math.PI);
						ctx.fill();

						// Add border (need new path)
						ctx.strokeStyle = nodeBorderColor;
						ctx.lineWidth = nodeBorderWidth / transform.k;
						ctx.beginPath();
						ctx.arc(node.canvasX, node.canvasY, radius, 0, 2 * Math.PI);
						ctx.stroke();

						// Highlight hovered node with additional border
						if (hoveredNode?.productId === node.productId) {
							ctx.strokeStyle = 'red';
							ctx.lineWidth = 3;
							ctx.beginPath();
							ctx.arc(node.canvasX, node.canvasY, radius, 0, 2 * Math.PI);
							ctx.stroke();
						}
						// Highlight connected nodes with red border
						else if (hoveredNode && connectedNodeIds.has(node.productId)) {
							ctx.strokeStyle = 'red';
							ctx.lineWidth = 3;
							ctx.beginPath();
							ctx.arc(node.canvasX, node.canvasY, radius, 0, 2 * Math.PI);
							ctx.stroke();
						}
					}
				});
			}
		} catch (error) {
			console.error('Error rendering nodes:', error);
		}
	}

	function renderLabels(): void {
		if (!ctx || !showLabels) return;

		try {
			ctx.fillStyle = '#333333';
			ctx.font = `${10 / transform.k}px Arial`;
			ctx.textAlign = 'left';
			ctx.textBaseline = 'middle';

			const visibleNodes = processedData.nodes.filter((node) => {
				if (!node.canvasX || !node.canvasY) return false;
				const screenX = node.canvasX * transform.k + transform.x;
				const screenY = node.canvasY * transform.k + transform.y;
				return screenX >= -50 && screenX <= width + 50 && screenY >= -50 && screenY <= height + 50;
			});

			visibleNodes.slice(0, 50).forEach((node) => {
				if (node.canvasX && node.canvasY && ctx) {
					const text = node.label || node.productId;
					ctx.fillText(text, node.canvasX + (node.size || nodeRadius) + 5, node.canvasY);
				}
			});
		} catch (error) {
			console.error('Error rendering labels:', error);
		}
	}

	function renderTooltip(): void {
		if (!ctx || !hoveredNode || !hoveredNode.canvasX || !hoveredNode.canvasY) return;

		// Look up product information from metadata
		const productInfo = metadata.productHs92.find((p) => p.productId === hoveredNode!.productId);
		const text = productInfo
			? `${productInfo.productName} (${productInfo.productCode})`
			: hoveredNode!.productId; // Fallback to productId if not found
		const padding = 8;
		const fontSize = 12;
		const offsetY = 25; // Distance above/below the node

		ctx.font = `${fontSize}px Arial`;
		const textWidth = ctx.measureText(text).width;

		const nodeScreenX = hoveredNode.canvasX * transform.k + transform.x;
		const nodeScreenY = hoveredNode.canvasY * transform.k + transform.y;

		// Default position atop node
		let tooltipX = nodeScreenX - (textWidth + padding * 2) / 2; // Center horizontally on node
		let tooltipY = nodeScreenY - offsetY; // Above the node

		// Check if tooltip would go off-screen and adjust position
		const tooltipWidth = textWidth + padding * 2;
		const tooltipHeight = fontSize + padding * 2;

		if (tooltipX < 5) {
			tooltipX = 5; 
		} else if (tooltipX + tooltipWidth > width - 5) {
			tooltipX = width - tooltipWidth - 5; 
		}

		if (tooltipY - tooltipHeight < 5) {
			tooltipY = nodeScreenY + offsetY; // Below the node instead
		}

		if (tooltipY + tooltipHeight > height - 5) {
			tooltipY = Math.max(5, nodeScreenY - offsetY);
		}

		ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
		ctx.fillRect(tooltipX, tooltipY - fontSize - padding, tooltipWidth, tooltipHeight);

		ctx.fillStyle = '#ffffff';
		ctx.fillText(text, tooltipX + padding, tooltipY - padding);
	}

	function setupEventListeners(): void {
		if (!canvas) return;

		let isDragging = false;
		let lastX = 0;
		let lastY = 0;

		// Mouse wheel zoom
		if (enableZoom) {
			canvas.addEventListener('wheel', (e) => {
				e.preventDefault();

				const rect = canvas!.getBoundingClientRect();
				const mouseX = e.clientX - rect.left;
				const mouseY = e.clientY - rect.top;

				const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
				const newK = Math.max(0.1, Math.min(10, transform.k * scaleFactor));

				const newX = mouseX - (mouseX - transform.x) * (newK / transform.k);
				const newY = mouseY - (mouseY - transform.y) * (newK / transform.k);

				transform = { x: newX, y: newY, k: newK };
				redraw();
			});
		}

		canvas.addEventListener('mousedown', (e) => {
			isDragging = true;
			lastX = e.clientX;
			lastY = e.clientY;
			canvas!.style.cursor = 'grabbing';
		});

		canvas.addEventListener('mousemove', (e) => {
			if (isDragging && enableZoom) {
				const deltaX = e.clientX - lastX;
				const deltaY = e.clientY - lastY;

				transform = {
					...transform,
					x: transform.x + deltaX,
					y: transform.y + deltaY
				};

				lastX = e.clientX;
				lastY = e.clientY;
				redraw();
			} else {
				// Handle hover
				handleMouseHover(e);
			}
		});

		canvas.addEventListener('mouseup', () => {
			isDragging = false;
			canvas!.style.cursor = 'grab';
		});

		canvas.addEventListener('mouseleave', () => {
			isDragging = false;
			hoveredNode = null;
			canvas!.style.cursor = 'default';
			redraw();
		});
	}

	function handleMouseHover(e: MouseEvent): void {
		if (!canvas || !xScale || !yScale) return;

		try {
			const rect = canvas.getBoundingClientRect();
			const mouseX = e.clientX - rect.left;
			const mouseY = e.clientY - rect.top;

			// Transform mouse coordinates to data space
			const dataX = (mouseX - transform.x) / transform.k;
			const dataY = (mouseY - transform.y) / transform.k;

			// Find closest node within reasonable distance
			let closestNode: Node | null = null;
			let minDistance = Infinity;
			const maxDistance = 15 / transform.k; // Larger hit area

			// Only check a subset of nodes for performance
			const nodesToCheck = processedData.nodes.slice(0, 5000);
			nodesToCheck.forEach((node) => {
				if (node.canvasX && node.canvasY) {
					const distance = Math.sqrt(
						Math.pow(dataX - node.canvasX, 2) + Math.pow(dataY - node.canvasY, 2)
					);

					if (distance < maxDistance && distance < minDistance) {
						minDistance = distance;
						closestNode = node;
					}
				}
			});

			if (closestNode !== hoveredNode) {
				hoveredNode = closestNode;
				canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
				redraw();
			}
		} catch (error) {
			console.error('Error handling hover:', error);
		}
	}

	function resetZoom(): void {
		transform = { x: 0, y: 0, k: 1 };
		redraw();
	}

	export { resetZoom };
</script>

<div class="canvas-container">
	<canvas
		bind:this={canvas}
		style:cursor={enableZoom ? 'grab' : 'default'}
		style:opacity={isLoading ? 0.3 : 1}
	></canvas>
</div>

<style>
	.canvas-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
	}

	canvas {
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
