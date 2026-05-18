import re

with open('script.js', 'r') as f:
    content = f.read()

# 1. Add Radial Menu element to the document and logic vars
init_vars = """    const radialMenu = document.createElement('div');
    radialMenu.className = 'radial-menu';
    canvasContainer.appendChild(radialMenu);

    let currentNetworkSet = 'standard';
"""

content = content.replace("    let draggedNode = null;\n    let isDraggingNode = false;", init_vars + "    let draggedNode = null;\n    let isDraggingNode = false;")

# Track currentNetworkSet
content = content.replace("    function renderPalette(setKey) {", "    function renderPalette(setKey) {\n        currentNetworkSet = setKey;")

# 2. Add showRadialMenu and hideRadialMenu functions
radial_funcs = """    function hideRadialMenu() {
        radialMenu.classList.remove('visible');
    }

    function showRadialMenu(nodeId) {
        if (selectedNodeIds.length !== 1) {
            hideRadialMenu();
            return;
        }

        const node = nodes[nodeId];
        if (!node) return;

        // Position menu at the center of the node
        radialMenu.style.left = `${node.centerX * scale + panX}px`;
        radialMenu.style.top = `${node.centerY * scale + panY}px`;

        // Build items based on current palette
        radialMenu.innerHTML = '';
        const items = elementSets[currentNetworkSet] || [];

        // Calculate circle math
        const radius = 60; // distance from center
        const angleStep = (2 * Math.PI) / items.length;

        items.forEach((itemType, index) => {
            const angle = index * angleStep - Math.PI / 2; // start at top
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            const btn = document.createElement('div');
            btn.className = 'radial-item';
            btn.style.left = `calc(50% + ${x}px - 18px)`; // 18 is half width
            btn.style.top = `calc(50% + ${y}px - 18px)`;

            // Abbreviate text if too long
            btn.textContent = itemType.length > 5 ? itemType.substring(0, 4) + '.' : itemType;
            btn.title = itemType; // tooltip

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                quickSpawnNode(nodeId, itemType, angle);
                hideRadialMenu();
            });

            radialMenu.appendChild(btn);
        });

        radialMenu.classList.add('visible');
    }

    function quickSpawnNode(sourceId, type, angle) {
        const sourceNode = nodes[sourceId];
        if (!sourceNode) return;

        const spawnDistance = 120; // Distance to spawn new node
        const newX = sourceNode.x + Math.cos(angle) * spawnDistance;
        const newY = sourceNode.y + Math.sin(angle) * spawnDistance;

        // Snap to grid
        const snapX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        const snapY = Math.round(newY / GRID_SIZE) * GRID_SIZE;

        // Create new node element
        const id = 'node_' + Date.now();
        const el = document.createElement('div');
        el.className = 'node';
        el.textContent = type;
        el.style.left = snapX + 'px';
        el.style.top = snapY + 'px';

        canvas.appendChild(el);

        nodes[id] = {
            id: id,
            element: el,
            type: type,
            x: snapX,
            y: snapY,
            width: 80,
            height: 54,
            centerX: snapX + 40,
            centerY: snapY + 27
        };

        el.addEventListener('mousedown', (e) => handleNodeMouseDown(e, id));
        el.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            el.contentEditable = true;
            el.focus();
            document.execCommand('selectAll', false, null);
        });

        const finishEditing = () => {
            if (el.contentEditable === 'true') {
                el.contentEditable = false;
                updateNodePosition(id);
                saveState();
            }
        };

        el.addEventListener('blur', finishEditing);
        el.addEventListener('keydown', (ke) => {
            if (ke.key === 'Enter') {
                ke.preventDefault();
                finishEditing();
            }
        });

        // Create connection
        createConnection(sourceId, id);

        // Select the newly spawned node
        setTimeout(() => {
            updateNodePosition(id);
            selectNode(id);
            saveState();
        }, 10);
    }
"""

content = content.replace("    // --- Drag from Palette ---", radial_funcs + "\n    // --- Drag from Palette ---")

# 3. Add hideRadialMenu on mousedown/pan/deselect
content = content.replace("deselectAllNodes();\n        }", "deselectAllNodes();\n        }\n        hideRadialMenu();") # in deselectAllNodes

content = content.replace("function deselectAllNodes() {", "function deselectAllNodes() {\n        hideRadialMenu();")

# 4. Trigger showRadialMenu on selectNode
content = content.replace("updateActiveSwatch(hex);\n            }", "updateActiveSwatch(hex);\n            }\n            if (selectedNodeIds.length === 1) {\n                showRadialMenu(id);\n            } else {\n                hideRadialMenu();\n            }")

content = content.replace("colorPresetsContainer.classList.add('disabled');\n            }", "colorPresetsContainer.classList.add('disabled');\n            }\n            if (selectedNodeIds.length === 1) {\n                showRadialMenu(selectedNodeIds[0]);\n            } else {\n                hideRadialMenu();\n            }")

# Hide radial menu while panning or moving nodes
content = content.replace("canvasContainer.classList.add('panning');", "canvasContainer.classList.add('panning');\n                hideRadialMenu();")
content = content.replace("isDraggingNode = true;", "isDraggingNode = true;\n        hideRadialMenu();")

# After node drop, show radial menu? Wait, handleNodeMouseUp shows it if 1 node is selected.
content = content.replace("hasMovedNode = true;\n            }", "hasMovedNode = true;\n            }\n            if (selectedNodeIds.length === 1) {\n                showRadialMenu(selectedNodeIds[0]);\n            }")


with open('script.js', 'w') as f:
    f.write(content)
