interface DataItem {
	id: string | number;
	parent: string | number | null;
	level?: string;
	[key: string]: unknown;
}

interface NestedDataItem extends DataItem {
	children: NestedDataItem[];
}

export default function nestData(data: DataItem[]): NestedDataItem[] {
	const itemMap = new Map<string | number, NestedDataItem>();

	data.forEach((item) => {
		itemMap.set(item.id, { ...item, children: [] });
	});

	const rootItems: NestedDataItem[] = [];

	itemMap.forEach((item) => {
		if (item.parent === null) {
			rootItems.push(item);
		} else {
			const parent = itemMap.get(item.parent);
			if (parent) {
				parent.children.push(item);
			}
		}
	});

	return rootItems;
}
