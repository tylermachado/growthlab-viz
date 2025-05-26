<script lang="ts">
  import NetworkGraph from '../components/NetworkGraph.svelte';
  import rawData from '$lib/nodes_edges.json';

  // Type definitions
  interface Node {
    productId: string;
    x: number;
    y: number;
    label?: string;
    size?: number;
    color?: string;
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

  interface RawData {
    nodes: Array<{
      productId: string;
      x: number | null;
      y: number | null;
    }>;
    edges: Array<{
      source: string;
      target: string;
    }>;
  }

  function transformData(raw: RawData): GraphData {
    const validNodes: Node[] = raw.nodes
      .filter((node): node is { productId: string; x: number; y: number } => 
        node.x !== null && node.y !== null
      )
      .map(node => ({
        productId: node.productId,
        x: node.x,
        y: node.y
      }));

    const validNodeIds = new Set(validNodes.map(node => node.productId));

    // Update data to fit the component's expected format
    const validLinks: Link[] = raw.edges
      .filter(edge => 
        validNodeIds.has(edge.source) && validNodeIds.has(edge.target)
      )
      .map(edge => ({
        source: edge.source,
        target: edge.target,
        value: 1
      }));

    return {
      nodes: validNodes,
      links: validLinks
    };
  }

  const graphData: GraphData = transformData(rawData as RawData);

  // Configuration states
  let enableZoom = $state(true);
  let showLabels = $state(false);
  let nodeRadius = $state(4);
	let nodeBorderWidth = $state(1);
	let nodeBorderColor = $state('#cccccc');
  let backgroundColor = $state('#ffffff');
  let nodeColor = $state('#4f46e5');
  let linkOpacity = $state(1);
  let linkColor = $state('#cccccc');
  let maxNodes = $state(8000); 
  let maxLinks = $state(12000); 

  let canvasGraph: any;
</script>

<main>
	<NetworkGraph 
    bind:this={canvasGraph}
    data={graphData} 
    width={900} 
    height={600}
    {nodeRadius}
		{nodeBorderWidth}
		{nodeBorderColor}
    {enableZoom}
    {showLabels}
    {linkOpacity}
    {backgroundColor}
    {nodeColor}
    {linkColor}
    {maxNodes}
    {maxLinks}
    padding={10}
  />
</main>

<style>
  main {
    padding: 2rem;
    text-align: center;
  }
</style>