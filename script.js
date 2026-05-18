document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const canvasContainer = document.getElementById('canvas-container');
    const svgLayer = document.getElementById('connection-layer');
const colorPicker = document.getElementById('node-color');
    const colorPresetsContainer = document.getElementById('color-presets');
    const networkTypeSelector = document.getElementById('network-type-selector');
const paletteElementsContainer = document.getElementById('palette-elements');
    const btnSave = document.getElementById('btn-save');
    const btnLoad = document.getElementById('btn-load');
    const loadFile = document.getElementById('load-file');
    const btnExportSvg = document.getElementById('btn-export-svg');
    const btnExportPng = document.getElementById('btn-export-png');
    const btnClear = document.getElementById('btn-clear');

    const presetColors = [
        '#ffffff', // White
        '#f8d7da', // Pastel Red
        '#d4edda', // Pastel Green
        '#cce5ff', // Pastel Blue
        '#fff3cd', // Pastel Yellow
        '#e2e3e5', // Light Gray
        '#f5c6cb', // Darker Red
        '#b8daff', // Darker Blue
        '#ffeeba', // Darker Yellow
        '#343a40'  // Dark
    ];

    function initColorPresets() {
        presetColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.dataset.color = color;

            swatch.addEventListener('click', () => {
                if (selectedNodeIds.length > 0) {
                    applyColorToSelected(color);
                    updateActiveSwatch(color);
                    saveState();
                }
            });
            colorPresetsContainer.appendChild(swatch);
        });
    }

    function updateActiveSwatch(hexColor) {
        // Normalise hex format to lowercase for comparison
        const normalized = hexColor.toLowerCase();
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            if (swatch.dataset.color.toLowerCase() === normalized) {
                swatch.classList.add('active');
            } else {
                swatch.classList.remove('active');
            }
        });
        colorPicker.value = normalized;
    }

    function applyColorToSelected(hexColor) {
        selectedNodeIds.forEach(id => {
            if (nodes[id]) {
                nodes[id].element.style.backgroundColor = hexColor;
                nodes[id].element.style.color = getContrastYIQ(hexColor);
            }
        });
    }

    initColorPresets();

    let draggedType = null;
    const radialMenu = document.createElement('div');
    radialMenu.className = 'radial-menu';
    canvasContainer.appendChild(radialMenu);

    let currentNetworkSet = 'standard';
    let draggedNode = null;
    let isDraggingNode = false;
    let hasMovedNode = false;
    let nodeOffset = { x: 0, y: 0 };

let nodes = {}; // Map of id -> { element, x, y, width, height }
    let connections = []; // Array of { sourceId, targetId, svgLine }
    let selectedNodeIds = [];

    // Undo/Redo State
    let stateHistory = [];
    let historyIndex = -1;
    let isRestoringState = false; // flag to prevent recursion

    function saveState() {
        if (isRestoringState) return;

        // If we are not at the end of the history, truncate the future
        if (historyIndex < stateHistory.length - 1) {
            stateHistory = stateHistory.slice(0, historyIndex + 1);
        }

        stateHistory.push(JSON.stringify(getCurrentState()));

        // Optional: limit history size to prevent memory leaks
        if (stateHistory.length > 50) {
            stateHistory.shift();
        } else {
            historyIndex++;
        }
    }

    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            isRestoringState = true;
            loadState(JSON.parse(stateHistory[historyIndex]));
            isRestoringState = false;
        }
    }

    function redo() {
        if (historyIndex < stateHistory.length - 1) {
            historyIndex++;
            isRestoringState = true;
            loadState(JSON.parse(stateHistory[historyIndex]));
            isRestoringState = false;
        }
    }

    // Waypoint state
    let isDraggingWaypoint = false;
    let hasMovedWaypoint = false;
    let draggedWaypoint = null;
    let draggedConnection = null;

    // Pan & Zoom state
    let scale = 1;
    let panX = 0;
    let panY = 0;
    let isPanningCanvas = false;
    let panStartX = 0;
    let panStartY = 0;
    const GRID_SIZE = 20;

    function applyTransform() {
        const transformStr = `translate(${panX}px, ${panY}px) scale(${scale})`;
        canvas.style.transform = transformStr;
        svgLayer.style.transform = transformStr;
        canvasContainer.style.backgroundPosition = `${panX}px ${panY}px`;
        canvasContainer.style.backgroundSize = `${GRID_SIZE * scale}px ${GRID_SIZE * scale}px`;
    }

    // --- Dynamic Palette ---
const elementSets = {
        'standard': ['Router', 'Switch', 'Server', 'Client'],
        '3gpp': ['UE', 'eNodeB', 'MME', 'SGW', 'PGW', 'HSS'],
        '5gsa': ['UE', 'gNodeB', 'AMF', 'SMF', 'UPF', 'PCF', 'UDM', 'UDR', 'NSSF', 'NEF']
    };

    function renderPalette(setKey) {
        currentNetworkSet = setKey;
        paletteElementsContainer.innerHTML = '';
        const items = elementSets[setKey] || [];
        items.forEach(type => {
            const el = document.createElement('div');
            el.className = 'palette-item';
            el.draggable = true;
            el.dataset.type = type;
            el.textContent = type;
            paletteElementsContainer.appendChild(el);
        });
    }

    // Initialize palette
    renderPalette(networkTypeSelector.value);

    networkTypeSelector.addEventListener('change', (e) => {
        renderPalette(e.target.value);
    });

// Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.isContentEditable) return; // don't undo diagram if typing text

        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            } else if (e.key === 'y') {
                e.preventDefault();
                redo();
            }
        }

        // Allow deleting selected nodes/connections with Backspace/Delete
        if (e.key === 'Backspace' || e.key === 'Delete') {
            if (selectedNodeIds.length > 0) {
                selectedNodeIds.forEach(id => {
                    connections = connections.filter(c => {
                        if (c.sourceId === id || c.targetId === id) {
                            if (c.svgGroup.parentNode) c.svgGroup.parentNode.removeChild(c.svgGroup);
                            c.waypoints.forEach(wp => {
                                if (wp.element.parentNode) wp.element.parentNode.removeChild(wp.element);
                            });
                            return false;
                        }
                        return true;
                    });
                    const node = nodes[id];
                    if (node && node.element.parentNode) node.element.parentNode.removeChild(node.element);
                    console.log('Deleted node', id, node !== undefined); delete nodes[id];
                });
                deselectAllNodes();
                saveState();
            }
        }
    });

    // Initialize initial empty state
    saveState();

    function hideRadialMenu() {

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

    // --- Drag from Palette ---
    // Use event delegation for dynamically added items
    paletteElementsContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('palette-item')) {
            draggedType = e.target.dataset.type;
            e.dataTransfer.setData('text/plain', draggedType);
            e.dataTransfer.effectAllowed = 'copy';
        }
    });

    canvasContainer.addEventListener('dragover', (e) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'copy';
    });

canvasContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('text/plain');
        if (!type) return;

        const containerRect = canvasContainer.getBoundingClientRect();

        // Calculate coordinate in canvas space, factoring in pan and zoom
        let x = (e.clientX - containerRect.left - panX) / scale;
        let y = (e.clientY - containerRect.top - panY) / scale;

        // Snap to grid
        x = Math.round((x - 40) / GRID_SIZE) * GRID_SIZE;
        y = Math.round((y - 25) / GRID_SIZE) * GRID_SIZE;

const id = 'node_' + Date.now();
        const el = document.createElement('div');
        el.className = 'node';
        el.textContent = type; // Use exactly what was passed

        el.style.left = x + 'px';
        el.style.top = y + 'px';

        canvas.appendChild(el);

        nodes[id] = {
            id: id,
            element: el,
            type: type
        };
        saveState();

        // Node Interaction Events

        el.addEventListener('mousedown', (e) => handleNodeMouseDown(e, id));

        // Renaming functionality
        el.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            el.contentEditable = true;
            el.focus();
            document.execCommand('selectAll', false, null); // Select text for easy replacement
        });

        const finishEditing = () => {
            if (el.contentEditable === 'true') {
                el.contentEditable = false;
                // Text change might change size, so update lines
                updateNodePosition(id);
                saveState();
            }
        };

        el.addEventListener('blur', finishEditing);
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent newline
                finishEditing();
            }
        });

        updateNodePosition(id);
    });

function updateNodePosition(id) {
        const node = nodes[id];
        // Read directly from style to bypass scale/pan complications, or use unscaled logic
        node.x = parseFloat(node.element.style.left) || 0;
        node.y = parseFloat(node.element.style.top) || 0;

        // To get width/height, we can divide the bounded rect by scale
        const rect = node.element.getBoundingClientRect();
        node.width = rect.width / scale;
        node.height = rect.height / scale;

        node.centerX = node.x + node.width / 2;
        node.centerY = node.y + node.height / 2;

        updateConnections();
    }

    // --- Dragging Existing Nodes & Selection ---
    function handleNodeMouseDown(e, id) {
        if (e.target.isContentEditable) return; // Allow normal text interaction
        e.stopPropagation(); // Prevent canvas background click

        if (e.shiftKey) {
            const lastSelectedId = selectedNodeIds[selectedNodeIds.length - 1];
            if (lastSelectedId && lastSelectedId !== id) {
                createConnection(lastSelectedId, id);
                deselectAllNodes();
                selectNode(id);
            } else {
                selectNode(id, true);
            }
            return;
        } else if (e.ctrlKey || e.metaKey) {
            selectNode(id, true);
            return;
        }

        if (!selectedNodeIds.includes(id)) {
            selectNode(id);
        }


        isDraggingNode = true;

        selectedNodeIds.forEach(selId => {
            const node = nodes[selId];
            if (node) {
                const rect = node.element.getBoundingClientRect();
                node.dragOffsetX = (e.clientX - rect.left) / scale;
                node.dragOffsetY = (e.clientY - rect.top) / scale;
            }
        });

        document.addEventListener('mousemove', handleNodeMouseMove);
        document.addEventListener('mouseup', handleNodeMouseUp);
    }


function handleNodeMouseMove(e) {
        if (isDraggingWaypoint && draggedWaypoint) {
            const containerRect = canvasContainer.getBoundingClientRect();
            let wx = (e.clientX - containerRect.left - panX) / scale;
            let wy = (e.clientY - containerRect.top - panY) / scale;

            // Snap to grid
            wx = Math.round(wx / GRID_SIZE) * GRID_SIZE;
            wy = Math.round(wy / GRID_SIZE) * GRID_SIZE;

            draggedWaypoint.x = wx;
            draggedWaypoint.y = wy;
            draggedWaypoint.element.setAttribute('cx', draggedWaypoint.x);
            draggedWaypoint.element.setAttribute('cy', draggedWaypoint.y);
            updateConnections();
            hasMovedWaypoint = true;
            return;
        }

        if (!isDraggingNode || selectedNodeIds.length === 0) return;

        hideRadialMenu(); // hide when actually dragging
        const containerRect = canvasContainer.getBoundingClientRect();

        selectedNodeIds.forEach(selId => {
            const node = nodes[selId];
            if (node) {
                let newX = (e.clientX - containerRect.left - panX) / scale - (node.dragOffsetX || 0);
                let newY = (e.clientY - containerRect.top - panY) / scale - (node.dragOffsetY || 0);

                // Snap to grid
                newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
                newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;

                node.element.style.left = newX + 'px';
                node.element.style.top = newY + 'px';
                updateNodePosition(node.id);
            }
        });
        hasMovedNode = true;
    }


function handleNodeMouseUp(e) {
        if (isDraggingWaypoint) {
            isDraggingWaypoint = false;
            draggedWaypoint = null;
            draggedConnection = null;
            document.removeEventListener('mousemove', handleNodeMouseMove);
            document.removeEventListener('mouseup', handleNodeMouseUp);
            saveState();
            return;
        }

        if (isDraggingNode) {
            isDraggingNode = false;
            draggedNode = null;
            document.removeEventListener('mousemove', handleNodeMouseMove);
            document.removeEventListener('mouseup', handleNodeMouseUp);
            if (selectedNodeIds.length === 1) {
                showRadialMenu(selectedNodeIds[0]);
            }
            saveState();
        }
    }

    // --- Node Properties ---
    function getContrastYIQ(hexcolor){
        // If a leading # is provided, remove it
        if (hexcolor.slice(0, 1) === '#') {
            hexcolor = hexcolor.slice(1);
        }

        // If a three-character hexcode, make six-character
        if (hexcolor.length === 3) {
            hexcolor = hexcolor.split('').map(function (hex) {
                return hex + hex;
            }).join('');
        }

        // Convert to RGB value
        var r = parseInt(hexcolor.substr(0,2),16);
        var g = parseInt(hexcolor.substr(2,2),16);
        var b = parseInt(hexcolor.substr(4,2),16);

        // Get YIQ ratio
        var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

        // Check contrast
        return (yiq >= 128) ? 'black' : 'white';
    }

colorPicker.addEventListener('input', (e) => {
        applyColorToSelected(e.target.value);
        updateActiveSwatch(e.target.value);
    });

    function rgbToHex(rgb) {
        if (rgb.startsWith('#')) return rgb;
        const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (!match) return '#ffffff';
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
    }

    function selectNode(id, addToSelection = false) {
        if (!addToSelection) deselectAllNodes();
        if (!selectedNodeIds.includes(id)) {
            selectedNodeIds.push(id);
            nodes[id].element.classList.add('selected');

            if (selectedNodeIds.length > 0) {
                const rgb = window.getComputedStyle(nodes[selectedNodeIds[0]].element).backgroundColor;
                const hex = rgbToHex(rgb);
                colorPicker.disabled = false;
                colorPresetsContainer.classList.remove('disabled');
                colorPicker.value = hex;
                updateActiveSwatch(hex);
            }
            if (selectedNodeIds.length === 1) {
                showRadialMenu(selectedNodeIds[0]);
            } else {
                hideRadialMenu();
            }
        } else if (addToSelection) {
            // toggle off
            nodes[id].element.classList.remove('selected');
            selectedNodeIds = selectedNodeIds.filter(selId => selId !== id);

            if (selectedNodeIds.length > 0) {
                const rgb = window.getComputedStyle(nodes[selectedNodeIds[0]].element).backgroundColor;
                const hex = rgbToHex(rgb);
                colorPicker.disabled = false;
                colorPresetsContainer.classList.remove('disabled');
                colorPicker.value = hex;
                updateActiveSwatch(hex);
            } else if (selectedNodeIds.length === 0) {
                colorPicker.disabled = true;
                colorPresetsContainer.classList.add('disabled');
            }

            if (selectedNodeIds.length === 1) {
                showRadialMenu(selectedNodeIds[0]);
            } else {
                hideRadialMenu();
            }
        }
    }

    function deselectAllNodes() {
        hideRadialMenu();
        selectedNodeIds.forEach(id => {
            if (nodes[id]) nodes[id].element.classList.remove('selected');
        });
        selectedNodeIds = [];
        colorPicker.disabled = true;
        colorPresetsContainer.classList.add('disabled');
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    }

    let isSelecting = false;
    let startSelectionX = 0;
    let startSelectionY = 0;
    let selectionBox = null;

    canvasContainer.addEventListener('mousedown', (e) => {
        if (e.target === canvasContainer || e.target === canvas || e.target === svgLayer) {
            if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                deselectAllNodes();
            }

            // Middle click (button 1) or Shift-left-click to pan
            if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
                e.preventDefault(); // prevent auto-scroll on middle click
                isPanningCanvas = true;
                panStartX = e.clientX - panX;
                panStartY = e.clientY - panY;
                canvasContainer.classList.add('panning');
                hideRadialMenu();
            } else if (e.button === 0) {
                // Normal left click-and-drag to select
                isSelecting = true;
                startSelectionX = e.clientX;
                startSelectionY = e.clientY;
                selectionBox = document.createElement('div');
                selectionBox.style.position = 'absolute';
                selectionBox.style.border = '1px dashed #007bff';
                selectionBox.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
                selectionBox.style.pointerEvents = 'none';
                selectionBox.style.zIndex = '1000';
                canvasContainer.appendChild(selectionBox);
            }
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (isPanningCanvas) {
            panX = e.clientX - panStartX;
            panY = e.clientY - panStartY;
            applyTransform();
        } else if (isSelecting && selectionBox) {
            const currentX = e.clientX;
            const currentY = e.clientY;

            const rect = canvasContainer.getBoundingClientRect();
            const left = Math.min(startSelectionX, currentX) - rect.left;
            const top = Math.min(startSelectionY, currentY) - rect.top;
            const width = Math.abs(currentX - startSelectionX);
            const height = Math.abs(currentY - startSelectionY);

            selectionBox.style.left = `${left}px`;
            selectionBox.style.top = `${top}px`;
            selectionBox.style.width = `${width}px`;
            selectionBox.style.height = `${height}px`;
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (isPanningCanvas) {
            isPanningCanvas = false;
            canvasContainer.classList.remove('panning');
        } else if (isSelecting) {
            isSelecting = false;

            if (selectionBox) {
                const currentX = e.clientX;
                const currentY = e.clientY;

                const minX = Math.min(startSelectionX, currentX);
                const maxX = Math.max(startSelectionX, currentX);
                const minY = Math.min(startSelectionY, currentY);
                const maxY = Math.max(startSelectionY, currentY);

                // Check intersection
                Object.values(nodes).forEach(n => {
                    const nodeRect = n.element.getBoundingClientRect();
                    // Intersect logic
                    if (nodeRect.left < maxX && nodeRect.right > minX &&
                        nodeRect.top < maxY && nodeRect.bottom > minY) {
                        selectNode(n.id, true);
                    }
                });

                if (selectionBox.parentNode) {
                    selectionBox.parentNode.removeChild(selectionBox);
                }
                selectionBox = null;
            }
        }
    });

    canvasContainer.addEventListener('wheel', (e) => {
        if (e.target !== canvasContainer && e.target !== canvas && e.target !== svgLayer && !e.target.closest('.node')) {
            // allow scrolling properties panel if it has one
            // but for canvas container we want to zoom
        }

        // Prevent default scrolling
        e.preventDefault();

        const zoomSensitivity = 0.001;
        const delta = e.deltaY * -zoomSensitivity;
        let newScale = scale + delta;

        // constrain scale
        newScale = Math.min(Math.max(0.2, newScale), 5);

        // zoom towards mouse position
        const containerRect = canvasContainer.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;

        // calculate new pan to keep mouse pointing at the same canvas point
        panX = mouseX - (mouseX - panX) * (newScale / scale);
        panY = mouseY - (mouseY - panY) * (newScale / scale);

        scale = newScale;
        applyTransform();
        if (selectedNodeIds.length === 1) {
            showRadialMenu();
        }
    }, { passive: false });

    // --- Connections ---
function createConnection(sourceId, targetId, initialFlow = 'forward', initialWaypoints = [], initialLabel = '') {
        // Prevent duplicate connections
        if (connections.some(c => (c.sourceId === sourceId && c.targetId === targetId) || (c.sourceId === targetId && c.targetId === sourceId))) {
            return;
        }

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.classList.add('connection-group');

        const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hitArea.classList.add('connection-hitarea');

        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line1.classList.add('connection', 'animated');

        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line2.classList.add('connection', 'animated-reverse');
        line2.style.display = 'none';

        const textLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textLabel.classList.add('connection-label');
        textLabel.textContent = initialLabel;

        group.appendChild(hitArea);
        group.appendChild(line1);
        group.appendChild(line2);
        group.appendChild(textLabel);
        svgLayer.appendChild(group);

        const connectionObj = {
            id: 'conn_' + sourceId + '_' + targetId,
            sourceId: sourceId,
            targetId: targetId,
            svgGroup: group,
            hitArea: hitArea,
            line1: line1,
            line2: line2,
            textLabel: textLabel,
            flow: initialFlow, // 'forward', 'reverse', 'bidirectional'
            label: initialLabel,
            waypoints: []
        };

        // Apply initial flow UI
        if (initialFlow === 'reverse') {
            line1.classList.remove('animated');
            line1.classList.add('animated-reverse');
        } else if (initialFlow === 'bidirectional') {
            line2.style.display = '';
        }

        // Apply initial waypoints
        initialWaypoints.forEach(wp => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', wp.x);
            circle.setAttribute('cy', wp.y);
            circle.setAttribute('r', 5);
            circle.classList.add('waypoint');
            group.appendChild(circle);

            const wpObj = { x: wp.x, y: wp.y, element: circle };
            connectionObj.waypoints.push(wpObj);

            circle.addEventListener('mousedown', (we) => {
                we.stopPropagation();
                isDraggingWaypoint = true;
                draggedWaypoint = wpObj;
                draggedConnection = connectionObj;
                document.addEventListener('mousemove', handleNodeMouseMove);
                document.addEventListener('mouseup', handleNodeMouseUp);
            });
        });

group.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.detail === 2) {
                // Double click logic!
                // If another editor is open, close it
                const existingInput = document.querySelector('.inline-editor');
                if (existingInput) existingInput.blur();

                // Get center point of connection
                let textX = parseFloat(connectionObj.textLabel.getAttribute('x')) || 0;
                let textY = parseFloat(connectionObj.textLabel.getAttribute('y')) || 0;

                if (textX === 0 && textY === 0) {
                    const containerRect = canvasContainer.getBoundingClientRect();
                    textX = (e.clientX - containerRect.left - panX) / scale || 0;
                    textY = (e.clientY - containerRect.top - panY) / scale || 0;
                }

                const input = document.createElement('input');
                input.type = 'text';
                input.value = connectionObj.label || '';
                input.className = 'inline-editor';

                input.style.left = textX + 'px';
                input.style.top = textY + 'px';

                canvasContainer.appendChild(input);
                input.focus();

                const saveLabel = () => {
                    connectionObj.label = input.value;
                    connectionObj.textLabel.textContent = input.value;
                    if (input.parentNode) {
                        input.parentNode.removeChild(input);
                    }
                    updateConnections();
                };

                input.addEventListener('blur', saveLabel);
                input.addEventListener('keydown', (ke) => {
                    if (ke.key === 'Enter') {
                        ke.preventDefault();
                        saveLabel();
                    }
                });
                return; // exit standard click
            }

            if (e.altKey) {
                // Add waypoint
                const containerRect = canvasContainer.getBoundingClientRect();
                let wx = (e.clientX - containerRect.left - panX) / scale;
                let wy = (e.clientY - containerRect.top - panY) / scale;

                // Snap
                wx = Math.round(wx / GRID_SIZE) * GRID_SIZE;
                wy = Math.round(wy / GRID_SIZE) * GRID_SIZE;

                const waypoint = { x: wx, y: wy };

                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', wx);
                circle.setAttribute('cy', wy);
                circle.setAttribute('r', 5);
                circle.classList.add('waypoint');

                // insert waypoint into DOM and data
                group.appendChild(circle);

                const wpObj = { ...waypoint, element: circle };
                connectionObj.waypoints.push(wpObj);

circle.addEventListener('mousedown', (we) => {
                    we.stopPropagation();
                    isDraggingWaypoint = true;
                    draggedWaypoint = wpObj;
                    draggedConnection = connectionObj;
                    document.addEventListener('mousemove', handleNodeMouseMove);
                    document.addEventListener('mouseup', handleNodeMouseUp);
                });

                updateConnections();
                saveState();
                return;
            }

            if (connectionObj.flow === 'forward') {

                connectionObj.flow = 'reverse';
                connectionObj.line1.classList.remove('animated');
                connectionObj.line1.classList.add('animated-reverse');
            } else if (connectionObj.flow === 'reverse') {
                connectionObj.flow = 'bidirectional';
                connectionObj.line1.classList.remove('animated-reverse');
                connectionObj.line1.classList.add('animated');
                connectionObj.line2.style.display = '';
            } else {
                connectionObj.flow = 'forward';
                connectionObj.line1.classList.remove('animated-reverse');
                connectionObj.line1.classList.add('animated');
                connectionObj.line2.style.display = 'none';
            }
            updateConnections();
            saveState();
        });

group.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // If another editor is open, close it
            const existingInput = document.querySelector('.inline-editor');
            if (existingInput) existingInput.blur();

            // Get center point of connection
            let textX = parseFloat(connectionObj.textLabel.getAttribute('x')) || 0;
            let textY = parseFloat(connectionObj.textLabel.getAttribute('y')) || 0;

            if (textX === 0 && textY === 0) {
                const containerRect = canvasContainer.getBoundingClientRect();
                textX = (e.clientX - containerRect.left - panX) / scale || 0;
                textY = (e.clientY - containerRect.top - panY) / scale || 0;
            }

const input = document.createElement('input');
            input.type = 'text';
            input.value = connectionObj.label || '';
            input.className = 'inline-editor';

            // Append to canvas instead of canvasContainer so that textX/textY (which are unscaled coordinates) map perfectly to the scaled canvas element!
            input.style.left = textX + 'px';
            input.style.top = textY + 'px';

            canvas.appendChild(input);
            input.focus();

            const saveLabel = () => {
                connectionObj.label = input.value;
                connectionObj.textLabel.textContent = input.value;
                if (input.parentNode) {
                    input.parentNode.removeChild(input);
                }
                updateConnections();
                saveState();
            };

            input.addEventListener('blur', saveLabel);
            input.addEventListener('keydown', (ke) => {
                if (ke.key === 'Enter') {
                    ke.preventDefault();
                    saveLabel();
                }
            });
        });

        group.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Remove any waypoint circles from the DOM
            connectionObj.waypoints.forEach(wp => {
                if (wp.element.parentNode) {
                    wp.element.parentNode.removeChild(wp.element);
                }
            });
            svgLayer.removeChild(group);
            connections = connections.filter(c => c.id !== connectionObj.id);
            saveState();
        });

        connections.push(connectionObj);

        updateConnections();
    }


    function updateConnections() {
        connections.forEach(conn => {
            const source = nodes[conn.sourceId];
            const target = nodes[conn.targetId];

            if (source && target) {
                const points = [
                    { x: source.centerX, y: source.centerY },
                    ...conn.waypoints,
                    { x: target.centerX, y: target.centerY }
                ];

                function getNormal(p1, p2) {
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    if (len === 0) return { nx: 0, ny: 0 };
                    return { nx: -dy / len, ny: dx / len };
                }

                if (conn.flow === 'bidirectional') {
                    const offset = 5;
                    let path1D = '';
                    let path2D = '';

                    for (let i = 0; i < points.length; i++) {
                        let nx = 0, ny = 0;
                        if (i === 0) {
                            const n = getNormal(points[0], points[1]);
                            nx = n.nx; ny = n.ny;
                        } else if (i === points.length - 1) {
                            const n = getNormal(points[i - 1], points[i]);
                            nx = n.nx; ny = n.ny;
                        } else {
                            const n1 = getNormal(points[i - 1], points[i]);
                            const n2 = getNormal(points[i], points[i + 1]);
                            // Average the normals to miter the corner
                            const avgX = n1.nx + n2.nx;
                            const avgY = n1.ny + n2.ny;
                            const len = Math.sqrt(avgX * avgX + avgY * avgY);
                            if (len !== 0) {
                                nx = avgX / len;
                                ny = avgY / len;

                                // adjust offset by miter ratio if angle is sharp
                                // miter = offset / dot(n1, avg_n)
                                const dot = n1.nx * nx + n1.ny * ny;
                                if (dot > 0.1) { // avoid infinity if angle is near 180 degrees
                                    nx = nx / dot;
                                    ny = ny / dot;
                                }
                            } else {
                                nx = n1.nx; ny = n1.ny;
                            }
                        }

                        const p1x = points[i].x + nx * offset;
                        const p1y = points[i].y + ny * offset;
                        const p2x = points[i].x - nx * offset;
                        const p2y = points[i].y - ny * offset;

                        if (i === 0) {
                            path1D += `M ${p1x} ${p1y} `;
                            path2D += `M ${p2x} ${p2y} `;
                        } else {
                            path1D += `L ${p1x} ${p1y} `;
                            path2D += `L ${p2x} ${p2y} `;
                        }
                    }

conn.line1.setAttribute('d', path1D);
                    conn.line2.setAttribute('d', path2D);
                } else {
                    let pathD = '';
                    points.forEach((p, i) => {
                        if (i === 0) pathD += `M ${p.x} ${p.y} `;
                        else pathD += `L ${p.x} ${p.y} `;
                    });
                    conn.line1.setAttribute('d', pathD);
                }

// Calculate center path for hitArea
                let centerPathD = '';
                points.forEach((p, i) => {
                    if (i === 0) centerPathD += `M ${p.x} ${p.y} `;
                    else centerPathD += `L ${p.x} ${p.y} `;
                });
                conn.hitArea.setAttribute('d', centerPathD);

                // Calculate midpoint for label
                let totalLength = 0;
                const segments = [];
                for (let i = 0; i < points.length - 1; i++) {
                    const p1 = points[i];
                    const p2 = points[i+1];
                    const len = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                    segments.push({ p1, p2, len });
                    totalLength += len;
                }

                let targetLen = totalLength / 2;
                let currentLen = 0;
                let midX = 0, midY = 0;

                for (const seg of segments) {
                    if (currentLen + seg.len >= targetLen) {
                        const ratio = (targetLen - currentLen) / seg.len;
                        midX = seg.p1.x + (seg.p2.x - seg.p1.x) * ratio;
                        midY = seg.p1.y + (seg.p2.y - seg.p1.y) * ratio;
                        break;
                    }
                    currentLen += seg.len;
                }

                conn.textLabel.setAttribute('x', midX);
                conn.textLabel.setAttribute('y', midY);
                // Offset slightly so it's above the line if preferred, or centered. We'll do centered with stroke.
            }
        });
    }
// --- Save and Load JSON ---
function getCurrentState() {
        return {
            scale: scale,
            panX: panX,
            panY: panY,
            nodes: Object.values(nodes).map(n => ({
                id: n.id,
                type: n.type,
                textContent: n.element.textContent,
                x: n.x,
                y: n.y,
                width: n.width,
                height: n.height,
                backgroundColor: window.getComputedStyle(n.element).backgroundColor,
                color: window.getComputedStyle(n.element).color
            })),
            connections: connections.map(c => ({
                sourceId: c.sourceId,
                targetId: c.targetId,
                flow: c.flow,
                label: c.label,
                waypoints: c.waypoints.map(wp => ({ x: wp.x, y: wp.y }))
            }))
        };
    }

    function loadState(state) {
        clearCanvas();

        scale = state.scale || 1;
        panX = state.panX || 0;
        panY = state.panY || 0;
        applyTransform();

        // Restore nodes
        if (state.nodes) {
            state.nodes.forEach(nData => {
                const el = document.createElement('div');
                el.className = 'node';
                el.textContent = nData.textContent || nData.type;

                el.style.left = nData.x + 'px';
                el.style.top = nData.y + 'px';
                // Convert rgb string back to hex if needed, or just apply it
                el.style.backgroundColor = nData.backgroundColor || 'white';
                el.style.color = nData.color || 'black';

                canvas.appendChild(el);

                nodes[nData.id] = {
                    id: nData.id,
                    element: el,
                    type: nData.type,
                    x: nData.x,
                    y: nData.y,
                    width: nData.width || 80,
                    height: nData.height || 54,
                    centerX: nData.x + (nData.width || 80) / 2,
                    centerY: nData.y + (nData.height || 54) / 2
                };

                el.addEventListener('mousedown', (e) => handleNodeMouseDown(e, nData.id));
                el.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    el.contentEditable = true;
                    el.focus();
                    document.execCommand('selectAll', false, null);
                });

                const finishEditing = () => {
                    if (el.contentEditable === 'true') {
                        el.contentEditable = false;
                        updateNodePosition(nData.id);
                    }
                };
                el.addEventListener('blur', finishEditing);
                el.addEventListener('keydown', (ke) => {
                    if (ke.key === 'Enter') {
                        ke.preventDefault();
                        finishEditing();
                    }
                });

                // Force layout calculations after appending
                setTimeout(() => { updateNodePosition(nData.id); }, 0);
            });
        }

        // Restore connections
        if (state.connections) {
            // we need to wait for nodes to be properly positioned before drawing lines
            setTimeout(() => {
                state.connections.forEach(cData => {
                    createConnection(cData.sourceId, cData.targetId, cData.flow, cData.waypoints, cData.label);
                });
            }, 10);
        }
    }

    function clearCanvas() {
        // Remove all nodes
        Object.values(nodes).forEach(n => {
            if (n.element.parentNode) {
                n.element.parentNode.removeChild(n.element);
            }
        });
        nodes = {};

        // Remove all connections
        connections.forEach(c => {
            if (c.svgGroup.parentNode) {
                c.svgGroup.parentNode.removeChild(c.svgGroup);
            }
            c.waypoints.forEach(wp => {
                if (wp.element && wp.element.parentNode) {
                    wp.element.parentNode.removeChild(wp.element);
                }
            });
        });
        connections = [];

        deselectAllNodes();
        scale = 1;
        panX = 0;
        panY = 0;
        applyTransform();
    }

    btnClear.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the canvas?')) {
            clearCanvas();
            saveState();
        }
    });

btnSave.addEventListener('click', () => {
        const state = getCurrentState();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "diagram.json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    btnLoad.addEventListener('click', () => {
        loadFile.click();
    });

loadFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const state = JSON.parse(evt.target.result);
                loadState(state);
            } catch (err) {
                console.error(err);
                alert('Error parsing JSON file');
            }
            loadFile.value = ''; // reset
        };
        reader.readAsText(file);
    });

function escapeXml(unsafe) {
        if (!unsafe) return '';
        return unsafe.replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    }

    function generateSVGString() {
        // Calculate Bounding Box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const allNodes = Object.values(nodes);
        if (allNodes.length === 0) return null;

        allNodes.forEach(n => {
            if (n.x < minX) minX = n.x;
            if (n.y < minY) minY = n.y;
            if (n.x + n.width > maxX) maxX = n.x + n.width;
            if (n.y + n.height > maxY) maxY = n.y + n.height;
        });

        connections.forEach(c => {
            c.waypoints.forEach(wp => {
                if (wp.x < minX) minX = wp.x;
                if (wp.y < minY) minY = wp.y;
                if (wp.x > maxX) maxX = wp.x;
                if (wp.y > maxY) maxY = wp.y;
            });
        });

        // Add padding
        minX -= 50; minY -= 50; maxX += 50; maxY += 50;
        const width = maxX - minX;
        const height = maxY - minY;

        // Base SVG wrapper
        let svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}">`;

// Add styles
        svgStr += `<style>
            .connection { fill: none; stroke: #555; stroke-width: 3; stroke-linecap: round; }
            .connection.animated { stroke-dasharray: 10; }
            .connection.animated-reverse { stroke-dasharray: 10; }
            .connection-hitarea { fill: none; stroke: transparent; stroke-width: 20; }
            .waypoint { fill: white; stroke: #007bff; stroke-width: 2; }
            .node-bg { stroke: #333; stroke-width: 2; rx: 8; ry: 8; }
            .node-text { font-family: sans-serif; font-size: 16px; text-anchor: middle; dominant-baseline: middle; }
            .connection-label { font-family: sans-serif; font-size: 14px; font-weight: bold; fill: #333; text-anchor: middle; dominant-baseline: middle; paint-order: stroke; stroke: white; stroke-width: 4px; stroke-linecap: butt; stroke-linejoin: miter; }
        </style>`;

        // Add connections (raw HTML from the svg layer, removing transform if any)
        // Actually, just clone the group contents
svgStr += `<g id="connections">`;
        connections.forEach(c => {
            const groupClone = c.svgGroup.cloneNode(true);
            const textEl = groupClone.querySelector('.connection-label');
            if (textEl && textEl.textContent) {
                textEl.textContent = escapeXml(textEl.textContent);
            }
            svgStr += groupClone.outerHTML;
        });
        svgStr += `</g>`;

// Add nodes
        svgStr += `<g id="nodes">`;
        allNodes.forEach(n => {
            const bg = window.getComputedStyle(n.element).backgroundColor;
            const fg = window.getComputedStyle(n.element).color;
            svgStr += `<rect class="node-bg" x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" fill="${bg}" />`;
            svgStr += `<text class="node-text" x="${n.centerX}" y="${n.centerY}" fill="${fg}">${escapeXml(n.element.textContent)}</text>`;
        });
        svgStr += `</g></svg>`;

        return svgStr;
    }

    btnExportSvg.addEventListener('click', () => {
        const svg = generateSVGString();
        if (!svg) return alert("Canvas is empty");
        const blob = new Blob([svg], {type: "image/svg+xml;charset=utf-8"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "diagram.svg";
        document.body.appendChild(a);
        a.click();
        a.remove();
    });

    btnExportPng.addEventListener('click', () => {
        const svg = generateSVGString();
        if (!svg) return alert("Canvas is empty");

        const blob = new Blob([svg], {type: "image/svg+xml;charset=utf-8"});
        const url = URL.createObjectURL(blob);

const img = new Image();
        img.onerror = (e) => {
            console.error("Failed to load SVG into Image for PNG conversion", e);
            alert("Failed to export PNG. See console.");
        };
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            // Draw white background
            ctx.fillStyle = '#fafafa';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.drawImage(img, 0, 0);

            canvas.toBlob(pngBlob => {
                const pngUrl = URL.createObjectURL(pngBlob);
                const a = document.createElement("a");
                a.href = pngUrl;
                a.download = "diagram.png";
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(pngUrl);
            });
            URL.revokeObjectURL(url);
        };
        img.src = url;
    });

    // Instruction overlay
    const instructions = document.createElement('div');
    instructions.style.position = 'absolute';
    instructions.style.bottom = '10px';
    instructions.style.left = '10px';
    instructions.style.color = '#888';
    instructions.style.pointerEvents = 'none';
    instructions.innerHTML = 'Drag elements from left.<br>Hold <b>Shift</b> and click two nodes to connect them.<br>Click lines to change flow direction.<br>Right-click lines to remove.<br>Double-click a node to rename it.<br><b>Alt-click</b> a line to add a waypoint, drag to route.<br>Scroll to zoom.<br><b>Click and drag</b> background to select multiple nodes.<br><b>Middle-click</b> (or Shift+drag) background to pan.';
    canvasContainer.appendChild(instructions);
});
