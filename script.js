document.addEventListener('DOMContentLoaded', () => {
    const paletteItems = document.querySelectorAll('.palette-item');
    const canvas = document.getElementById('canvas');
    const canvasContainer = document.getElementById('canvas-container');
    const svgLayer = document.getElementById('connection-layer');
    const colorPicker = document.getElementById('node-color');

    let draggedType = null;
    let draggedNode = null;
    let isDraggingNode = false;
    let nodeOffset = { x: 0, y: 0 };

    let nodes = {}; // Map of id -> { element, x, y, width, height }
    let connections = []; // Array of { sourceId, targetId, svgLine }
    let selectedNodeId = null;

    // --- Drag from Palette ---
    paletteItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedType = e.target.dataset.type;
            e.dataTransfer.setData('text/plain', draggedType);
            e.dataTransfer.effectAllowed = 'copy';
        });
    });

    canvasContainer.addEventListener('dragover', (e) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'copy';
    });

    canvasContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('text/plain');
        if (type) {
            const rect = canvasContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            createNode(type, x, y);
        }
        draggedType = null;
    });

    // --- Node Creation & Management ---
    let nodeIdCounter = 0;
    function createNode(type, x, y) {
        const id = 'node_' + nodeIdCounter++;
        const el = document.createElement('div');
        el.className = 'node';
        el.id = id;
        el.textContent = type.charAt(0).toUpperCase() + type.slice(1);

        // Initial arbitrary offset so mouse is roughly centered on drop
        el.style.left = (x - 40) + 'px';
        el.style.top = (y - 25) + 'px';

        canvas.appendChild(el);

        nodes[id] = {
            id: id,
            element: el,
            type: type
        };

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
    }

    function updateNodePosition(id) {
        const node = nodes[id];
        const rect = node.element.getBoundingClientRect();
        const containerRect = canvasContainer.getBoundingClientRect();

        node.x = rect.left - containerRect.left;
        node.y = rect.top - containerRect.top;
        node.width = rect.width;
        node.height = rect.height;
        node.centerX = node.x + node.width / 2;
        node.centerY = node.y + node.height / 2;

        updateConnections();
    }

    // --- Dragging Existing Nodes & Selection ---
    function handleNodeMouseDown(e, id) {
        if (e.target.isContentEditable) return; // Allow normal text interaction

        e.stopPropagation(); // Prevent canvas background click

        // Handle Selection for connections
        if (e.shiftKey) {
            // Shift-click to connect
            if (selectedNodeId && selectedNodeId !== id) {
                createConnection(selectedNodeId, id);
                deselectNode();
            } else {
                selectNode(id);
            }
            return;
        }

        // Handle normal drag
        selectNode(id);
        isDraggingNode = true;
        draggedNode = id;

        const rect = nodes[id].element.getBoundingClientRect();
        nodeOffset.x = e.clientX - rect.left;
        nodeOffset.y = e.clientY - rect.top;

        document.addEventListener('mousemove', handleNodeMouseMove);
        document.addEventListener('mouseup', handleNodeMouseUp);
    }

    function handleNodeMouseMove(e) {
        if (!isDraggingNode || !draggedNode) return;

        const containerRect = canvasContainer.getBoundingClientRect();

        // Calculate new position
        let newX = e.clientX - containerRect.left - nodeOffset.x;
        let newY = e.clientY - containerRect.top - nodeOffset.y;

        // Apply
        const el = nodes[draggedNode].element;
        el.style.left = newX + 'px';
        el.style.top = newY + 'px';

        updateNodePosition(draggedNode);
    }

    function handleNodeMouseUp(e) {
        isDraggingNode = false;
        draggedNode = null;
        document.removeEventListener('mousemove', handleNodeMouseMove);
        document.removeEventListener('mouseup', handleNodeMouseUp);
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
        if (selectedNodeId && nodes[selectedNodeId]) {
            const hexColor = e.target.value;
            nodes[selectedNodeId].element.style.backgroundColor = hexColor;
            nodes[selectedNodeId].element.style.color = getContrastYIQ(hexColor);
        }
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

    function selectNode(id) {
        deselectNode();
        selectedNodeId = id;
        nodes[id].element.classList.add('selected');

        // Update color picker
        const bgColor = window.getComputedStyle(nodes[id].element).backgroundColor;
        colorPicker.value = rgbToHex(bgColor);
        colorPicker.disabled = false;
    }

    function deselectNode() {
        if (selectedNodeId && nodes[selectedNodeId]) {
            nodes[selectedNodeId].element.classList.remove('selected');
        }
        selectedNodeId = null;
        colorPicker.disabled = true;
    }

    canvasContainer.addEventListener('mousedown', (e) => {
        if (e.target === canvasContainer || e.target === canvas || e.target === svgLayer) {
            deselectNode();
        }
    });

    // --- Connections ---
    function createConnection(sourceId, targetId) {
        // Prevent duplicate connections
        if (connections.some(c => (c.sourceId === sourceId && c.targetId === targetId) || (c.sourceId === targetId && c.targetId === sourceId))) {
            return;
        }

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.classList.add('connection-group');

        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.classList.add('connection', 'animated');

        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.classList.add('connection', 'animated-reverse');
        line2.style.display = 'none';

        group.appendChild(line1);
        group.appendChild(line2);
        svgLayer.appendChild(group);

        const connectionObj = {
            id: 'conn_' + sourceId + '_' + targetId,
            sourceId: sourceId,
            targetId: targetId,
            svgGroup: group,
            line1: line1,
            line2: line2,
            flow: 'forward' // 'forward', 'reverse', 'bidirectional'
        };

        group.addEventListener('click', (e) => {
            e.stopPropagation();
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
        });

        group.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            svgLayer.removeChild(group);
            connections = connections.filter(c => c.id !== connectionObj.id);
        });

        connections.push(connectionObj);

        updateConnections();
    }

    function updateConnections() {
        connections.forEach(conn => {
            const source = nodes[conn.sourceId];
            const target = nodes[conn.targetId];

            if (source && target) {
                if (conn.flow === 'bidirectional') {
                    // Calculate offsets for parallel lines
                    const dx = target.centerX - source.centerX;
                    const dy = target.centerY - source.centerY;
                    const len = Math.sqrt(dx * dx + dy * dy);

                    if (len === 0) return;

                    const nx = -dy / len;
                    const ny = dx / len;

                    const offset = 5;

                    conn.line1.setAttribute('x1', source.centerX + nx * offset);
                    conn.line1.setAttribute('y1', source.centerY + ny * offset);
                    conn.line1.setAttribute('x2', target.centerX + nx * offset);
                    conn.line1.setAttribute('y2', target.centerY + ny * offset);

                    conn.line2.setAttribute('x1', source.centerX - nx * offset);
                    conn.line2.setAttribute('y1', source.centerY - ny * offset);
                    conn.line2.setAttribute('x2', target.centerX - nx * offset);
                    conn.line2.setAttribute('y2', target.centerY - ny * offset);
                } else {
                    conn.line1.setAttribute('x1', source.centerX);
                    conn.line1.setAttribute('y1', source.centerY);
                    conn.line1.setAttribute('x2', target.centerX);
                    conn.line1.setAttribute('y2', target.centerY);
                }
            }
        });
    }

    // Instruction overlay
    const instructions = document.createElement('div');
    instructions.style.position = 'absolute';
    instructions.style.bottom = '10px';
    instructions.style.left = '10px';
    instructions.style.color = '#888';
    instructions.style.pointerEvents = 'none';
    instructions.innerHTML = 'Drag elements from left.<br>Hold <b>Shift</b> and click two nodes to connect them.<br>Click lines to change flow direction.<br>Right-click lines to remove.<br>Double-click a node to rename it.';
    canvasContainer.appendChild(instructions);
});
